#!/usr/bin/env python3
"""
ComfyUI-云岚AI 安装脚本
用于ComfyUI Manager自动安装依赖
"""

import subprocess
import sys
import os

def install_package(package):
    """安装Python包"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ 成功安装: {package}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 安装失败: {package} - {e}")
        return False

def main():
    """主安装函数"""
    print("🚀 开始安装 ComfyUI-云岚AI 依赖...")
    
    # 必需的依赖包
    required_packages = [
        "openai>=1.0.0",
        "requests>=2.25.0", 
        "Pillow>=8.0.0"
    ]
    
    success_count = 0
    total_count = len(required_packages)
    
    for package in required_packages:
        if install_package(package):
            success_count += 1
    
    print(f"\n📊 安装结果: {success_count}/{total_count} 个包安装成功")
    
    if success_count == total_count:
        print("🎉 所有依赖安装完成！ComfyUI-云岚AI 已准备就绪。")
        print("\n📝 使用说明:")
        print("1. 重启 ComfyUI")
        print("2. 在设置中配置 API Key 和 API URL")
        print("3. 开始使用云岚AI节点！")
        return True
    else:
        print("⚠️  部分依赖安装失败，请手动安装缺失的包。")
        print("💡 您也可以运行: pip install -r requirements.txt")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
