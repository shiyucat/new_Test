from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import json
import os

app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'test_platform.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


class TestCase(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    preconditions = db.Column(db.Text, nullable=True)
    steps = db.Column(db.Text, nullable=False)
    expected_results = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)
    priority = db.Column(db.String(2), default='P0')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        try:
            priority = self.priority
        except AttributeError:
            priority = 'P0'
        
        return {
            'id': self.id,
            'name': self.name,
            'preconditions': self.preconditions,
            'steps': json.loads(self.steps) if self.steps else [],
            'expected_results': json.loads(self.expected_results) if self.expected_results else [],
            'description': getattr(self, 'description', None),
            'priority': priority,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }


class TestPlan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        test_cases = TestPlanTestCase.query.filter_by(test_plan_id=self.id).order_by(
            TestPlanTestCase.order
        ).all()
        test_case_ids = [tc.test_case_id for tc in test_cases]
        test_cases_data = []
        latest_case_updated_at = None
        for tc_id in test_case_ids:
            tc = TestCase.query.get(tc_id)
            if tc:
                test_cases_data.append(tc.to_dict())
                if latest_case_updated_at is None or tc.updated_at > latest_case_updated_at:
                    latest_case_updated_at = tc.updated_at

        latest_updated_at = self.updated_at
        if latest_case_updated_at is not None and latest_case_updated_at > latest_updated_at:
            latest_updated_at = latest_case_updated_at

        if latest_updated_at < self.created_at:
            latest_updated_at = self.created_at

        return {
            'id': self.id,
            'name': self.name,
            'test_cases': test_cases_data,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': latest_updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }


class TestPlanTestCase(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    test_plan_id = db.Column(db.Integer, db.ForeignKey('test_plan.id'), nullable=False)
    test_case_id = db.Column(db.Integer, db.ForeignKey('test_case.id'), nullable=False)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now)


def test_logic():
    with app.app_context():
        print("=== 测试 TestPlan 更新时间逻辑 ===\n")
        
        test_plan = TestPlan.query.first()
        if test_plan:
            print(f"测试计划 ID: {test_plan.id}")
            print(f"测试计划名称: {test_plan.name}")
            print(f"测试计划 created_at: {test_plan.created_at}")
            print(f"测试计划 updated_at: {test_plan.updated_at}")
            print(f"测试计划 created_at <= updated_at: {test_plan.created_at <= test_plan.updated_at}")
            
            result = test_plan.to_dict()
            print(f"\n返回的 created_at: {result['created_at']}")
            print(f"返回的 updated_at: {result['updated_at']}")
            
            created_dt = datetime.strptime(result['created_at'], '%Y-%m-%d %H:%M:%S')
            updated_dt = datetime.strptime(result['updated_at'], '%Y-%m-%d %H:%M:%S')
            print(f"created_at <= updated_at: {created_dt <= updated_dt}")
            
            if created_dt > updated_dt:
                print("\n❌ 错误：更新时间小于创建时间！")
            else:
                print("\n✅ 正确：更新时间大于等于创建时间")
        else:
            print("没有测试计划数据")
            print("\n创建一个测试计划来验证逻辑...")
            
            test_case = TestCase.query.first()
            if test_case:
                test_plan = TestPlan(name="测试计划 - 验证逻辑")
                db.session.add(test_plan)
                db.session.commit()
                
                relation = TestPlanTestCase(
                    test_plan_id=test_plan.id,
                    test_case_id=test_case.id,
                    order=0
                )
                db.session.add(relation)
                db.session.commit()
                
                result = test_plan.to_dict()
                print(f"\n新创建的测试计划:")
                print(f"返回的 created_at: {result['created_at']}")
                print(f"返回的 updated_at: {result['updated_at']}")
                
                created_dt = datetime.strptime(result['created_at'], '%Y-%m-%d %H:%M:%S')
                updated_dt = datetime.strptime(result['updated_at'], '%Y-%m-%d %H:%M:%S')
                print(f"created_at <= updated_at: {created_dt <= updated_dt}")


if __name__ == '__main__':
    test_logic()
