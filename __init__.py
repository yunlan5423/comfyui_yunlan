"""
ComfyUI-云岚AI
一个功能丰富的ComfyUI自定义节点集合
"""

import os
import json
from aiohttp import web
import server

print("--- [云岚AI] ---")
print("开始加载云岚AI自定义节点...")
    
# --- Helper Functions ---
def get_api_settings():
    settings_path = os.path.join(os.path.dirname(__file__), "settings.json")
    if not os.path.exists(settings_path):
        return {}
    with open(settings_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_prompts():
    prompts_path = os.path.join(os.path.dirname(__file__), "prompts.json")
    if not os.path.exists(prompts_path):
        # 如果文件不存在，创建一个默认的
        default_prompts = {"示例提示词": "天空一声巨响，"}
        with open(prompts_path, 'w', encoding='utf-8') as f:
            json.dump(default_prompts, f, ensure_ascii=False, indent=4)
        return default_prompts
    with open(prompts_path, 'r', encoding='utf-8') as f:
        return json.load(f)
    
# --- API Endpoints ---
async def save_settings(request):
    data = await request.json()
    settings_path = os.path.join(os.path.dirname(__file__), "settings.json")
    with open(settings_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    return web.json_response({'status': 'ok'})

async def load_settings(request):
    return web.json_response(get_api_settings())

async def save_prompts(request):
    data = await request.json()
    prompts_path = os.path.join(os.path.dirname(__file__), "prompts.json")
    with open(prompts_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    return web.json_response({'status': 'ok'})

async def load_prompts(request):
    return web.json_response(get_prompts())

async def get_prompt_names(request):
    """获取所有提示词名称列表，用于更新下拉菜单"""
    prompts = get_prompts()
    return web.json_response(list(prompts.keys()))

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