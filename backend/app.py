from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test_platform.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
CORS(app)


class TestCase(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    preconditions = db.Column(db.Text, nullable=True)
    steps = db.Column(db.Text, nullable=False)
    expected_results = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'preconditions': self.preconditions,
            'steps': json.loads(self.steps) if self.steps else [],
            'expected_results': json.loads(self.expected_results) if self.expected_results else [],
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }


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
    
    testcase = TestCase(
        name=data['name'],
        preconditions=data.get('preconditions', ''),
        steps=json.dumps(steps),
        expected_results=json.dumps(expected_results)
    )
    
    db.session.add(testcase)
    db.session.commit()
    
    return jsonify(testcase.to_dict()), 201


@app.route('/api/testcases/<int:id>', methods=['GET'])
def get_testcase(id):
    testcase = TestCase.query.get_or_404(id)
    return jsonify(testcase.to_dict())


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
