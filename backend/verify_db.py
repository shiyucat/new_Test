import sqlite3
import os

def verify_database():
    db_path = os.path.join(os.path.dirname(__file__), 'test_platform.db')
    
    if not os.path.exists(db_path):
        print("数据库文件不存在。")
        return
    
    print(f"数据库文件路径: {db_path}")
    print(f"数据库文件大小: {os.path.getsize(db_path)} bytes")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("\n=== test_case 表结构 ===")
        cursor.execute("PRAGMA table_info(test_case)")
        columns = cursor.fetchall()
        for col in columns:
            print(f"  {col[1]}: {col[2]}")
        
        print("\n=== 尝试执行 SELECT 查询 ===")
        cursor.execute("SELECT id, name, priority, steps FROM test_case LIMIT 1")
        result = cursor.fetchone()
        print(f"查询结果: {result}")
        print("查询成功！")
        
    except Exception as e:
        print(f"出错: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    verify_database()
