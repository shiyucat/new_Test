import sqlite3
import os
import json

def fix_database():
    db_path = os.path.join(os.path.dirname(__file__), 'test_platform.db')
    
    if not os.path.exists(db_path):
        print("数据库文件不存在。")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("=== 修复 test_case 表 ===")
        
        cursor.execute("PRAGMA table_info(test_case)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        print(f"当前列: {column_names}")
        
        if 'precondition' in column_names and 'preconditions' not in column_names:
            print("重命名 precondition 为 preconditions...")
            cursor.execute("ALTER TABLE test_case RENAME COLUMN precondition TO preconditions")
            conn.commit()
            print("重命名成功！")
        
        cursor.execute("PRAGMA table_info(test_case)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'steps' not in column_names:
            print("添加 steps 列...")
            cursor.execute("ALTER TABLE test_case ADD COLUMN steps TEXT NOT NULL DEFAULT '[]'")
            conn.commit()
        
        if 'expected_results' not in column_names:
            print("添加 expected_results 列...")
            cursor.execute("ALTER TABLE test_case ADD COLUMN expected_results TEXT NOT NULL DEFAULT '[]'")
            conn.commit()
        
        if 'description' not in column_names:
            print("添加 description 列...")
            cursor.execute("ALTER TABLE test_case ADD COLUMN description TEXT")
            conn.commit()
        
        cursor.execute("PRAGMA table_info(test_case)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        print(f"修复后列: {column_names}")
        
        print("\n=== 创建缺失的表 ===")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_plan (
                id INTEGER PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                created_at DATETIME,
                updated_at DATETIME
            )
        """)
        conn.commit()
        print("test_plan 表已创建（如果不存在）")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_plan_test_case (
                id INTEGER PRIMARY KEY,
                test_plan_id INTEGER NOT NULL,
                test_case_id INTEGER NOT NULL,
                "order" INTEGER DEFAULT 0,
                created_at DATETIME,
                FOREIGN KEY (test_plan_id) REFERENCES test_plan (id),
                FOREIGN KEY (test_case_id) REFERENCES test_case (id)
            )
        """)
        conn.commit()
        print("test_plan_test_case 表已创建（如果不存在）")
        
        print("\n=== 验证表结构 ===")
        cursor.execute("PRAGMA table_info(test_plan)")
        columns = cursor.fetchall()
        print(f"test_plan 列: {[col[1] for col in columns]}")
        
        cursor.execute("PRAGMA table_info(test_plan_test_case)")
        columns = cursor.fetchall()
        print(f"test_plan_test_case 列: {[col[1] for col in columns]}")
        
    except Exception as e:
        print(f"修复过程中出错: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    fix_database()
    print("\n修复完成！")
