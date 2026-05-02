from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import sqlite3
import os

app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'test_platform.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class TestCaseDirectory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('test_case_directory.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    parent = db.relationship('TestCaseDirectory', remote_side=[id], backref='children')

def migrate_database():
    db_path = os.path.join(os.path.dirname(__file__), 'test_platform.db')
    
    if not os.path.exists(db_path):
        print("数据库文件不存在，将创建新数据库。")
        with app.app_context():
            db.create_all()
        print("数据库创建完成！")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='test_case_directory'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("正在创建 test_case_directory 表...")
            cursor.execute("""
                CREATE TABLE test_case_directory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL,
                    parent_id INTEGER,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP,
                    FOREIGN KEY (parent_id) REFERENCES test_case_directory (id)
                )
            """)
            conn.commit()
            print("成功创建 test_case_directory 表！")
        else:
            print("test_case_directory 表已存在。")
        
        cursor.execute("PRAGMA table_info(test_case)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        print("当前 test_case 表的列:", column_names)
        
        if 'priority' not in column_names:
            print("正在添加 priority 列...")
            cursor.execute("ALTER TABLE test_case ADD COLUMN priority VARCHAR(2) DEFAULT 'P0'")
            conn.commit()
            print("成功添加 priority 列！")
        else:
            print("priority 列已存在，无需添加。")
        
        if 'directory_id' not in column_names:
            print("正在添加 directory_id 列...")
            cursor.execute("ALTER TABLE test_case ADD COLUMN directory_id INTEGER")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_test_case_directory_id ON test_case(directory_id)")
            conn.commit()
            print("成功添加 directory_id 列！")
        else:
            print("directory_id 列已存在，无需添加。")
        
    except Exception as e:
        print(f"迁移过程中出错: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
    
    print("正在确保所有表结构正确...")
    with app.app_context():
        db.create_all()
    print("数据库结构验证完成！")

if __name__ == '__main__':
    migrate_database()
    print("迁移完成！")
