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


class TestCaseDirectory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('test_case_directory.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    parent = db.relationship('TestCaseDirectory', remote_side=[id], backref='children')

    def to_dict(self, include_children=True):
        result = {
            'id': self.id,
            'name': self.name,
            'parent_id': self.parent_id,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }
        if include_children:
            result['children'] = [child.to_dict(include_children=True) for child in self.children]
        return result


class TestCase(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    preconditions = db.Column(db.Text, nullable=True)
    steps = db.Column(db.Text, nullable=False)
    expected_results = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)
    priority = db.Column(db.String(2), default='P0')
    directory_id = db.Column(db.Integer, db.ForeignKey('test_case_directory.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    directory = db.relationship('TestCaseDirectory', backref='test_cases')

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
            'directory_id': self.directory_id,
            'directory_name': self.directory.name if self.directory else None,
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


@app.route('/api/directories', methods=['GET'])
def get_directories():
    directories = TestCaseDirectory.query.filter_by(parent_id=None).all()
    return jsonify([d.to_dict(include_children=True) for d in directories])


@app.route('/api/directories/all', methods=['GET'])
def get_all_directories():
    directories = TestCaseDirectory.query.order_by(TestCaseDirectory.created_at.asc()).all()
    return jsonify([{
        'id': d.id,
        'name': d.name,
        'parent_id': d.parent_id
    } for d in directories])


@app.route('/api/directories', methods=['POST'])
def create_directory():
    data = request.get_json()
    
    if not data.get('name') or len(data.get('name', '').strip()) == 0:
        return jsonify({'error': '目录名称不能为空'}), 400
    
    if len(data.get('name', '')) > 100:
        return jsonify({'error': '目录名称不能超过100字'}), 400
    
    parent_id = data.get('parent_id')
    if parent_id is not None:
        parent = TestCaseDirectory.query.get(parent_id)
        if not parent:
            return jsonify({'error': '父目录不存在'}), 400
    
    directory = TestCaseDirectory(
        name=data['name'].strip(),
        parent_id=parent_id
    )
    db.session.add(directory)
    db.session.commit()
    
    return jsonify(directory.to_dict(include_children=False)), 201


@app.route('/api/directories/<int:id>', methods=['PUT'])
def update_directory(id):
    directory = TestCaseDirectory.query.get_or_404(id)
    data = request.get_json()
    
    if not data.get('name') or len(data.get('name', '').strip()) == 0:
        return jsonify({'error': '目录名称不能为空'}), 400
    
    if len(data.get('name', '')) > 100:
        return jsonify({'error': '目录名称不能超过100字'}), 400
    
    parent_id = data.get('parent_id')
    if parent_id is not None:
        if parent_id == id:
            return jsonify({'error': '不能将目录设置为自己的子目录'}), 400
        parent = TestCaseDirectory.query.get(parent_id)
        if not parent:
            return jsonify({'error': '父目录不存在'}), 400
    
    directory.name = data['name'].strip()
    if 'parent_id' in data:
        directory.parent_id = parent_id
    
    db.session.commit()
    
    return jsonify(directory.to_dict(include_children=False))


@app.route('/api/directories/<int:id>', methods=['DELETE'])
def delete_directory(id):
    directory = TestCaseDirectory.query.get_or_404(id)
    
    test_cases = TestCase.query.filter_by(directory_id=id).all()
    if test_cases:
        return jsonify({'error': '目录下存在测试用例，无法删除'}), 400
    
    if directory.children:
        return jsonify({'error': '目录下存在子目录，无法删除'}), 400
    
    db.session.delete(directory)
    db.session.commit()
    
    return jsonify({'message': '删除成功'})


def get_all_subdirectory_ids(directory_id):
    """获取指定目录及其所有子目录的ID列表"""
    if directory_id is None:
        return None
    
    result = [directory_id]
    
    def get_children(parent_id):
        children = TestCaseDirectory.query.filter_by(parent_id=parent_id).all()
        for child in children:
            result.append(child.id)
            get_children(child.id)
    
    get_children(directory_id)
    return result


@app.route('/api/testcases', methods=['GET'])
def get_testcases():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)
    directory_id = request.args.get('directory_id', type=int)
    include_subdirs = request.args.get('include_subdirs', 'true', type=str).lower() == 'true'
    
    valid_page_sizes = [10, 20, 50, 100]
    if page_size not in valid_page_sizes:
        page_size = 10
    
    query = TestCase.query
    if directory_id is not None:
        if include_subdirs:
            directory_ids = get_all_subdirectory_ids(directory_id)
            query = query.filter(TestCase.directory_id.in_(directory_ids))
        else:
            query = query.filter_by(directory_id=directory_id)
    
    pagination = query.order_by(TestCase.created_at.desc()).paginate(
        page=page, per_page=page_size, error_out=False
    )
    
    return jsonify({
        'testcases': [tc.to_dict() for tc in pagination.items],
        'total': pagination.total,
        'page': page,
        'page_size': page_size,
        'total_pages': pagination.pages
    })


@app.route('/api/testcases', methods=['POST'])
def create_testcase():
    data = request.get_json()
    
    if not data.get('name') or len(data.get('name', '').strip()) == 0:
        return jsonify({'error': '用例名称不能为空'}), 400
    
    if len(data.get('name', '')) > 200:
        return jsonify({'error': '用例名称不能超过200字'}), 400
    
    directory_id = data.get('directory_id')
    if directory_id is None:
        return jsonify({'error': '请选择目录'}), 400
    
    if directory_id is not None:
        directory = TestCaseDirectory.query.get(directory_id)
        if not directory:
            return jsonify({'error': '目录不存在'}), 400
    
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
        'expected_results': json.dumps(expected_results),
        'directory_id': directory_id
    }
    
    # 处理 description 字段
    try:
        testcase_test = TestCase(**testcase_kwargs)
        _ = testcase_test.description
        # 如果可以访问 description 字段
        description = data.get('description', '')
        if len(description) > 200:
            return jsonify({'error': '描述不能超过200字'}), 400
        testcase_kwargs['description'] = description
    except AttributeError:
        pass
    
    # 处理 priority 字段
    try:
        testcase_test = TestCase(**testcase_kwargs)
        _ = testcase_test.priority
        # 如果可以访问 priority 字段
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
    
    directory_id = data.get('directory_id')
    if directory_id is None:
        return jsonify({'error': '请选择目录'}), 400
    
    if directory_id is not None:
        directory = TestCaseDirectory.query.get(directory_id)
        if not directory:
            return jsonify({'error': '目录不存在'}), 400
    
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
    testcase.directory_id = directory_id
    
    # 处理 description 字段
    try:
        _ = testcase.description
        description = data.get('description', '')
        if len(description) > 200:
            return jsonify({'error': '描述不能超过200字'}), 400
        testcase.description = description
    except AttributeError:
        pass
    
    # 处理 priority 字段
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
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)
    
    valid_page_sizes = [10, 20, 50, 100]
    if page_size not in valid_page_sizes:
        page_size = 10
    
    pagination = TestPlan.query.order_by(TestPlan.created_at.desc()).paginate(
        page=page, per_page=page_size, error_out=False
    )
    
    return jsonify({
        'testplans': [tp.to_dict() for tp in pagination.items],
        'total': pagination.total,
        'page': page,
        'page_size': page_size,
        'total_pages': pagination.pages
    })


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
    app.run(debug=True, port=6000)
