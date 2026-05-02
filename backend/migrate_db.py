from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import sqlite3
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test_platform.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

def migrate_database():
    db_path = os.path.join(os.path.dirname(__file__), 'test_platform.db')
    
    if not os.path.exists(db_path):
        print("数据库文件不存在，无需迁移。")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
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
        
    except Exception as e:
        print(f"迁移过程中出错: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()
    print("迁移完成！")
