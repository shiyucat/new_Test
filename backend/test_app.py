from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import json
import os

app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'test_platform.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
CORS(app)


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


@app.route('/api/testcases', methods=['GET'])
def get_testcases():
    testcases = TestCase.query.order_by(TestCase.created_at.desc()).all()
    return jsonify([tc.to_dict() for tc in testcases])


@app.route('/api/testcases', methods=['POST'])
def create_testcase():
    data = request.get_json()
    
    if not data.get('name') or len(data.get('name', '').strip()) == 0:
        return jsonify({'error': '用例名称不能为空'}), 400
    
    if len(data.get('name', '')) > 200:
        return jsonify({'error': '用例名称不能超过200字'}), 400
    
    steps = data.get('steps', [])
    expected_results = data.get('expected_results', [])
    
    if len(steps) != len(expected_results):
        return jsonify({'error': '测试步骤数量与预期结果数量不一致'}), 400
    
    for i, step in enumerate(steps):
        if len(step) > 500:
            return jsonify({'error': f'第{i+1}步测试步骤不能超过500字'}), 400
    
    for i, result in enumerate(expected_results):
        if len(result) > 500:
            return jsonify({'error': f'第{i+1}步预期结果不能超过500字'}), 400
    
    testcase_kwargs = {
        'name': data['name'],
        'preconditions': data.get('preconditions', ''),
        'steps': json.dumps(steps),
        'expected_results': json.dumps(expected_results)
    }
    
    try:
        testcase_test = TestCase(**testcase_kwargs)
        _ = testcase_test.description
        description = data.get('description', '')
        if len(description) > 200:
            return jsonify({'error': '描述不能超过200字'}), 400
        testcase_kwargs['description'] = description
    except AttributeError:
        pass
    
    try:
        testcase_test = TestCase(**testcase_kwargs)
        _ = testcase_test.priority
        priority = data.get('priority', 'P0')
        if priority not in ['P0', 'P1', 'P2', 'P3', 'P4']:
            priority = 'P0'
        testcase_kwargs['priority'] = priority
    except AttributeError:
        pass
    
    testcase = TestCase(**testcase_kwargs)
    
    db.session.add(testcase)
    db.session.commit()
    
    return jsonify(testcase.to_dict()), 201


@app.route('/api/testcases/<int:id>', methods=['GET'])
def get_testcase(id):
    testcase = TestCase.query.get_or_404(id)
    return jsonify(testcase.to_dict())


@app.route('/api/testcases/<int:id>', methods=['PUT'])
def update_testcase(id):
    testcase = TestCase.query.get_or_404(id)
    data = request.get_json()
    
    if not data.get('name') or len(data.get('name', '').strip()) == 0:
        return jsonify({'error': '用例名称不能为空'}), 400
    
    if len(data.get('name', '')) > 200:
        return jsonify({'error': '用例名称不能超过200字'}), 400
    
    steps = data.get('steps', [])
    expected_results = data.get('expected_results', [])
    
    if len(steps) != len(expected_results):
        return jsonify({'error': '测试步骤数量与预期结果数量不一致'}), 400
    
    for i, step in enumerate(steps):
        if len(step) > 500:
            return jsonify({'error': f'第{i+1}步测试步骤不能超过500字'}), 400
    
    for i, result in enumerate(expected_results):
        if len(result) > 500:
            return jsonify({'error': f'第{i+1}步预期结果不能超过500字'}), 400
    
    testcase.name = data['name']
    testcase.preconditions = data.get('preconditions', '')
    testcase.steps = json.dumps(steps)
    testcase.expected_results = json.dumps(expected_results)
    
    try:
        _ = testcase.description
        description = data.get('description', '')
        if len(description) > 200:
            return jsonify({'error': '描述不能超过200字'}), 400
        testcase.description = description
    except AttributeError:
        pass
    
    try:
        _ = testcase.priority
        priority = data.get('priority', 'P0')
        if priority not in ['P0', 'P1', 'P2', 'P3', 'P4']:
            priority = 'P0'
        testcase.priority = priority
    except AttributeError:
        pass
    
    db.session.commit()
    
    return jsonify(testcase.to_dict())


@app.route('/api/testplans', methods=['GET'])
def get_testplans():
    testplans = TestPlan.query.order_by(TestPlan.created_at.desc()).all()
    return jsonify([tp.to_dict() for tp in testplans])


@app.route('/api/testplans', methods=['POST'])
def create_testplan():
    data = request.get_json()
    
    if not data.get('name') or len(data.get('name', '').strip()) == 0:
        return jsonify({'error': '测试计划名称不能为空'}), 400
    
    if len(data.get('name', '')) > 200:
        return jsonify({'error': '测试计划名称不能超过200字'}), 400
    
    test_case_ids = data.get('test_case_ids', [])
    if not test_case_ids or len(test_case_ids) == 0:
        return jsonify({'error': '请至少选择一个测试用例'}), 400
    
    testplan = TestPlan(
        name=data['name'].strip()
    )
    db.session.add(testplan)
    db.session.flush()
    
    for order, tc_id in enumerate(test_case_ids):
        relation = TestPlanTestCase(
            test_plan_id=testplan.id,
            test_case_id=tc_id,
            order=order
        )
        db.session.add(relation)
    
    db.session.commit()
    
    return jsonify(testplan.to_dict()), 201


@app.route('/api/testplans/<int:id>', methods=['GET'])
def get_testplan(id):
    testplan = TestPlan.query.get_or_404(id)
    return jsonify(testplan.to_dict())


@app.route('/api/testplans/<int:id>', methods=['PUT'])
def update_testplan(id):
    testplan = TestPlan.query.get_or_404(id)
    data = request.get_json()
    
    if not data.get('name') or len(data.get('name', '').strip()) == 0:
        return jsonify({'error': '测试计划名称不能为空'}), 400
    
    if len(data.get('name', '')) > 200:
        return jsonify({'error': '测试计划名称不能超过200字'}), 400
    
    test_case_ids = data.get('test_case_ids', [])
    
    testplan.name = data['name'].strip()
    
    TestPlanTestCase.query.filter_by(test_plan_id=testplan.id).delete()
    
    for order, tc_id in enumerate(test_case_ids):
        relation = TestPlanTestCase(
            test_plan_id=testplan.id,
            test_case_id=tc_id,
            order=order
        )
        db.session.add(relation)
    
    db.session.commit()
    
    return jsonify(testplan.to_dict())


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=6001)
