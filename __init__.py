"""
ComfyUI-云岚AI
一个功能丰富的ComfyUI自定义节点集合
"""

import os
import json
import sys
from aiohttp import web
import server

print("--- [云岚AI] ---")
print("开始加载云岚AI自定义节点...")

# --- 依赖检查 ---
def check_dependencies():
    """检查必要的依赖包是否已安装"""
    missing_deps = []

    try:
        import openai
        print(f"[云岚AI] OpenAI 库版本: {openai.__version__}")
    except ImportError:
        missing_deps.append("openai>=1.0.0")

    try:
        import requests
        print(f"[云岚AI] Requests 库版本: {requests.__version__}")
    except ImportError:
        missing_deps.append("requests>=2.25.0")

    try:
        import PIL
        print(f"[云岚AI] Pillow 库版本: {PIL.__version__}")
    except ImportError:
        missing_deps.append("Pillow>=8.0.0")

    # 检查ComfyUI通常提供的依赖
    try:
        import torch
        import numpy as np
        print(f"[云岚AI] PyTorch 和 NumPy 已可用")
    except ImportError as e:
        print(f"[云岚AI] 警告: {e}")

    if missing_deps:
        print(f"[云岚AI] 错误: 缺少以下依赖包:")
        for dep in missing_deps:
            print(f"  - {dep}")
        print(f"[云岚AI] 请运行: pip install {' '.join(missing_deps)}")
        return False

    print("[云岚AI] 所有依赖检查通过")
    return True

# 执行依赖检查
if not check_dependencies():
    print("[云岚AI] 由于依赖缺失，部分功能可能无法正常工作")
    print("[云岚AI] 请安装缺失的依赖包后重启ComfyUI")
    
# --- Helper Functions ---
def get_api_settings():
    """安全地加载API设置"""
    settings_path = os.path.join(os.path.dirname(__file__), "settings.json")
    try:
        if not os.path.exists(settings_path):
            print("[云岚AI] 警告: settings.json 文件不存在，返回空设置")
            return {}

        with open(settings_path, 'r', encoding='utf-8') as f:
            settings = json.load(f)
            print("[云岚AI] 成功加载API设置")
            return settings
    except json.JSONDecodeError as e:
        print(f"[云岚AI] 错误: settings.json 格式错误 - {e}")
        return {}
    except PermissionError:
        print(f"[云岚AI] 错误: 无权限读取 {settings_path}")
        return {}
    except Exception as e:
        print(f"[云岚AI] 错误: 加载API设置时发生未知错误 - {e}")
        return {}

def get_prompts():
    """安全地加载提示词"""
    prompts_path = os.path.join(os.path.dirname(__file__), "prompts.json")
    default_prompts = {"示例提示词": "天空一声巨响，"}

    try:
        if not os.path.exists(prompts_path):
            print("[云岚AI] prompts.json 文件不存在，创建默认提示词文件")
            # 创建默认提示词文件
            try:
                with open(prompts_path, 'w', encoding='utf-8') as f:
                    json.dump(default_prompts, f, ensure_ascii=False, indent=4)
                print("[云岚AI] 成功创建默认提示词文件")
            except Exception as e:
                print(f"[云岚AI] 错误: 无法创建默认提示词文件 - {e}")
            return default_prompts

        with open(prompts_path, 'r', encoding='utf-8') as f:
            prompts = json.load(f)
            print("[云岚AI] 成功加载提示词")
            return prompts
    except json.JSONDecodeError as e:
        print(f"[云岚AI] 错误: prompts.json 格式错误 - {e}，使用默认提示词")
        return default_prompts
    except PermissionError:
        print(f"[云岚AI] 错误: 无权限读取 {prompts_path}，使用默认提示词")
        return default_prompts
    except Exception as e:
        print(f"[云岚AI] 错误: 加载提示词时发生未知错误 - {e}，使用默认提示词")
        return default_prompts
    
# --- API Endpoints ---
async def save_settings(request):
    """安全地保存API设置"""
    try:
        data = await request.json()
        settings_path = os.path.join(os.path.dirname(__file__), "settings.json")

        # 验证数据格式
        if not isinstance(data, dict):
            return web.json_response({'status': 'error', 'message': '无效的数据格式'}, status=400)

        with open(settings_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        print("[云岚AI] 成功保存API设置")
        return web.json_response({'status': 'ok'})
    except json.JSONDecodeError:
        return web.json_response({'status': 'error', 'message': '无效的JSON数据'}, status=400)
    except PermissionError:
        return web.json_response({'status': 'error', 'message': '无权限写入设置文件'}, status=500)
    except Exception as e:
        print(f"[云岚AI] 错误: 保存设置时发生错误 - {e}")
        return web.json_response({'status': 'error', 'message': f'保存失败: {str(e)}'}, status=500)

async def load_settings(request):
    """加载API设置"""
    try:
        settings = get_api_settings()
        return web.json_response(settings)
    except Exception as e:
        print(f"[云岚AI] 错误: 加载设置时发生错误 - {e}")
        return web.json_response({'status': 'error', 'message': f'加载失败: {str(e)}'}, status=500)

async def save_prompts(request):
    """安全地保存提示词"""
    try:
        data = await request.json()
        prompts_path = os.path.join(os.path.dirname(__file__), "prompts.json")

        # 验证数据格式
        if not isinstance(data, dict):
            return web.json_response({'status': 'error', 'message': '无效的数据格式'}, status=400)

        with open(prompts_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        print("[云岚AI] 成功保存提示词")
        return web.json_response({'status': 'ok'})
    except json.JSONDecodeError:
        return web.json_response({'status': 'error', 'message': '无效的JSON数据'}, status=400)
    except PermissionError:
        return web.json_response({'status': 'error', 'message': '无权限写入提示词文件'}, status=500)
    except Exception as e:
        print(f"[云岚AI] 错误: 保存提示词时发生错误 - {e}")
        return web.json_response({'status': 'error', 'message': f'保存失败: {str(e)}'}, status=500)

async def load_prompts(request):
    """加载提示词"""
    try:
        prompts = get_prompts()
        return web.json_response(prompts)
    except Exception as e:
        print(f"[云岚AI] 错误: 加载提示词时发生错误 - {e}")
        return web.json_response({'status': 'error', 'message': f'加载失败: {str(e)}'}, status=500)

async def get_prompt_names(request):
    """获取所有提示词名称列表，用于更新下拉菜单"""
    try:
        prompts = get_prompts()
        return web.json_response(list(prompts.keys()))
    except Exception as e:
        print(f"[云岚AI] 错误: 获取提示词名称时发生错误 - {e}")
        return web.json_response({'status': 'error', 'message': f'获取失败: {str(e)}'}, status=500)

# --- Node and Route Registration ---
from .nodes import api_nodes

# 确保节点映射正确导出
NODE_CLASS_MAPPINGS = {**api_nodes.NODE_CLASS_MAPPINGS}
NODE_DISPLAY_NAME_MAPPINGS = {**api_nodes.NODE_DISPLAY_NAME_MAPPINGS}
print(f"[云岚AI] 成功注册 {len(NODE_CLASS_MAPPINGS)} 个节点")
print(f"[云岚AI] 节点列表: {list(NODE_CLASS_MAPPINGS.keys())}")

WEB_DIRECTORY = "js"

@server.PromptServer.instance.routes.post("/yunlan/settings/save")
async def _save_settings_route(request): return await save_settings(request)
@server.PromptServer.instance.routes.get("/yunlan/settings/load")
async def _load_settings_route(request): return await load_settings(request)
@server.PromptServer.instance.routes.post("/yunlan/prompts/save")
async def _save_prompts_route(request): return await save_prompts(request)
@server.PromptServer.instance.routes.get("/yunlan/prompts/load")
async def _load_prompts_route(request): return await load_prompts(request)
@server.PromptServer.instance.routes.get("/yunlan/prompts/names")
async def _get_prompt_names_route(request): return await get_prompt_names(request)
print("[云岚AI] 成功注册API路由")

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY', 'get_api_settings', 'get_prompts']

print("--- [云岚AI] 加载完成 ---") 