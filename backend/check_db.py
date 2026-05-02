import sqlite3
import os

def check_database():
    db_path = os.path.join(os.path.dirname(__file__), 'test_platform.db')
    
    if not os.path.exists(db_path):
        print("数据库文件不存在。")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("=== 检查 test_case 表 ===")
        cursor.execute("PRAGMA table_info(test_case)")
        columns = cursor.fetchall()
        print("列名:")
        for col in columns:
            print(f"  {col[1]}: {col[2]}")
        
        print("\n=== 检查 test_plan 表 ===")
        cursor.execute("PRAGMA table_info(test_plan)")
        columns = cursor.fetchall()
        print("列名:")
        for col in columns:
            print(f"  {col[1]}: {col[2]}")
        
        print("\n=== 检查 test_plan_test_case 表 ===")
        cursor.execute("PRAGMA table_info(test_plan_test_case)")
        columns = cursor.fetchall()
        print("列名:")
        for col in columns:
            print(f"  {col[1]}: {col[2]}")
            
    except Exception as e:
        print(f"出错: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    check_database()
