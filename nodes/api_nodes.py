"""
API节点模块
包含与API交互的节点
"""

# 导入检查和错误处理
try:
    import requests
except ImportError:
    print("[云岚AI] 错误: 缺少 requests 库，请运行: pip install requests>=2.25.0")
    requests = None

try:
    import openai
except ImportError:
    print("[云岚AI] 错误: 缺少 openai 库，请运行: pip install openai>=1.0.0")
    openai = None

try:
    from PIL import Image
except ImportError:
    print("[云岚AI] 错误: 缺少 Pillow 库，请运行: pip install Pillow>=8.0.0")
    Image = None

try:
    import torch
except ImportError:
    print("[云岚AI] 错误: 缺少 PyTorch 库，这通常由ComfyUI提供")
    torch = None

try:
    import numpy as np
except ImportError:
    print("[云岚AI] 错误: 缺少 NumPy 库，这通常由ComfyUI提供")
    np = None

import json
import base64
import io
import random
import html
import re

# 安全导入父模块的函数
try:
    from .. import get_api_settings, get_prompts
except ImportError as e:
    # 提供备用函数
    def get_api_settings():
        return {}
    def get_prompts():
        return {"默认提示词": ""}

# 通用辅助函数
def create_empty_image():
    """创建空的图像tensor，如果torch不可用则返回None"""
    if torch is not None:
        return torch.zeros((1, 64, 64, 3), dtype=torch.float32, device="cpu")
    else:
        print("[云岚AI] 警告: PyTorch不可用，无法创建图像tensor")
        return None

def clean_text_for_ui(text):
    """清理文本以防止UI错乱"""
    if not text:
        return ""

    # 转换为字符串
    text = str(text)

    # 移除或转义HTML标签
    text = html.escape(text)

    # 移除控制字符（保留换行符和制表符）
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)

    # 限制文本长度（防止超长文本导致UI问题）
    max_length = 50000  # 50K字符限制
    if len(text) > max_length:
        text = text[:max_length] + "\n\n[文本过长，已截断...]"

    # 规范化换行符
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    return text

def safe_return_with_image(text_result, seed_value=0):
    """安全地返回带图像的结果，处理torch不可用的情况"""
    # 清理文本以防止UI错乱
    cleaned_text = clean_text_for_ui(text_result)

    empty_img = create_empty_image()
    if empty_img is not None:
        return (cleaned_text, empty_img, seed_value)
    else:
        return (cleaned_text, seed_value)

# Helper function to sanitize the base URL
def sanitize_base_url(url):
    """
    Automagically corrects the user-provided API URL.
    Removes common suffixes like /chat/completions to prevent URL duplication.
    """
    if not url:
        return ""
    url = url.strip()
    # Remove trailing suffixes if they exist
    suffixes_to_remove = ["/chat/completions", "/chat/completions/"]
    for suffix in suffixes_to_remove:
        if url.endswith(suffix):
            url = url[:-len(suffix)]
            break
    return url.rstrip('/')

# Helper function to convert tensor to base64
def tensor_to_base64(tensor):
    """安全地将tensor转换为base64编码的图像"""
    try:
        if Image is None:
            raise ImportError("PIL库未安装")
        if torch is None:
            raise ImportError("PyTorch库未安装")
        if np is None:
            raise ImportError("NumPy库未安装")

        # Convert tensor to numpy array
        np_array = tensor.squeeze(0).cpu().numpy()

        # Ensure the values are in the 0-255 range and uint8 type
        np_array = (np_array * 255).astype(np.uint8)

        # Create PIL Image from numpy array
        image = Image.fromarray(np_array)

        # Save image to a byte buffer
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")

        # Get base64 representation
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        print(f"[云岚AI] 错误: 转换图像为base64时发生错误 - {e}")
        raise

class YunlanAIDialog:
    @classmethod
    def INPUT_TYPES(s):
        try:
            # 动态加载模型列表
            settings = get_api_settings()
            models = settings.get("modelList", [])
            if not models or not isinstance(models, list) or len(models) == 0:
                models = ["gpt-4o", "gpt-4-turbo"]  # 备用列表
            
            # 确保模型列表中至少有一个元素
            if len(models) == 0:
                models = ["gpt-4o"]
                
            # 动态加载提示词
            try:
                prompts = get_prompts()
                prompt_names = list(prompts.keys())
                if not prompt_names:
                    prompt_names = ["默认提示词"]
                    
                # 确保默认提示词存在
                if "默认提示词" not in prompt_names:
                    prompt_names.append("默认提示词")
            except Exception as e:
                print(f"[云岚AI] 加载提示词时出错: {e}")
                prompt_names = ["默认提示词"]
            
            return {
                "required": {
                    "模型": (models,),
                    "提示词": (prompt_names,),
                    "附加文本": ("STRING", {"multiline": True, "default": ""}),
                    "种子模式": (["随机", "固定"],),
                    "种子": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                },
                "optional": {
                    "图片1": ("IMAGE",),
                    "图片2": ("IMAGE",),
                },
                "hidden": {
                    "prompt_id": "PROMPT_DIALOG",
                    "node_id": "UNIQUE_ID",
                    "preview": "PROMPT_PREVIEW",
                },
            }
        except Exception as e:
            print(f"[云岚AI] 初始化AI对话节点时出错: {e}")
            # 提供一个后备方案以确保节点能够加载
            return {
                "required": {
                    "模型": (["gpt-4o"],),
                    "提示词": (["默认提示词"],),
                    "附加文本": ("STRING", {"multiline": True, "default": ""}),
                    "种子模式": (["随机", "固定"],),
                    "种子": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                },
                "optional": {
                    "图片1": ("IMAGE",),
                    "图片2": ("IMAGE",),
                },
                "hidden": {
                    "prompt_id": "PROMPT_DIALOG",
                    "node_id": "UNIQUE_ID",
                    "preview": "PROMPT_PREVIEW",
                },
            }

    RETURN_TYPES = ("STRING", "IMAGE", "INT")
    RETURN_NAMES = ("文本", "图片", "使用的种子")
    FUNCTION = "run_dialog"
    CATEGORY = "云岚AI"

    def run_dialog(self, 模型, 提示词, 附加文本, 种子模式, 种子, 图片1=None, 图片2=None, prompt_id=None, node_id=None, preview=None):
        base_url = None  # Define for access in exception handlers

        try:
            # 检查关键依赖
            if openai is None:
                return safe_return_with_image("错误: OpenAI库未安装，请运行: pip install openai>=1.0.0")

            if torch is None:
                return safe_return_with_image("错误: PyTorch库未安装，这通常由ComfyUI提供")

            # 1. 加载并修正设置
            settings = get_api_settings()
            if not settings:
                return safe_return_with_image("错误: 无法加载API设置，请检查settings.json文件。")

            api_key = settings.get("apiKey")
            raw_base_url = settings.get("apiUrl")

            if not api_key:
                return safe_return_with_image("错误: 请在settings.json中配置API Key。")
            if not raw_base_url:
                return safe_return_with_image("错误: 请在settings.json中配置API URL。")

            base_url = sanitize_base_url(raw_base_url)

            # 2. 初始化OpenAI客户端
            try:
                client = openai.OpenAI(api_key=api_key, base_url=base_url)
            except Exception as e:
                return safe_return_with_image(f"错误: 无法初始化OpenAI客户端 - {e}")

            # 3. 构建提示
            prompt_content = ""
            try:
                prompts_dict = get_prompts()
                if isinstance(prompts_dict, dict) and 提示词 in prompts_dict:
                    prompt_content = prompts_dict[提示词]
                else:
                    # 提示词不在字典中，使用提示词名称作为内容
                    prompt_content = 提示词
            except Exception as e:
                print(f"[云岚AI] 警告: 构建提示时发生错误 - {e}")
                # 异常情况下，安全地使用提示词名称作为内容
                prompt_content = 提示词 if 提示词 else ""

            # 确保prompt_content是字符串类型
            if not isinstance(prompt_content, str):
                prompt_content = str(prompt_content) if prompt_content else ""

            # 确保附加文本是字符串类型
            附加文本_safe = str(附加文本) if 附加文本 else ""

            # 构建完整提示
            full_prompt = prompt_content + 附加文本_safe

            # 4. 构建API请求内容
            messages_content = [{"type": "text", "text": full_prompt}]

            # 安全地处理图片输入
            try:
                if 图片1 is not None:
                    base64_image = tensor_to_base64(图片1)
                    messages_content.append({"type": "image_url", "image_url": {"url": base64_image}})
            except Exception as e:
                print(f"[云岚AI] 警告: 处理图片1时发生错误 - {e}")

            try:
                if 图片2 is not None:
                    base64_image_2 = tensor_to_base64(图片2)
                    messages_content.append({"type": "image_url", "image_url": {"url": base64_image_2}})
            except Exception as e:
                pass

            # 5. 处理种子（仅用于工作流刷新，不传递给API）
            actual_seed = 种子
            if 种子模式 == "随机":
                actual_seed = random.randint(0, 0xffffffffffffffff)
            # 注意：种子仅用于ComfyUI工作流的刷新机制，不传递给API

            # 6. 调用API
            response = client.chat.completions.create(
                model=模型,
                messages=[{"role": "user", "content": messages_content}],
                max_tokens=2048,
            )

            # 兼容处理不同格式的API响应
            ai_response = None
            if hasattr(response, 'choices') and response.choices:
                if response.choices[0].message and response.choices[0].message.content:
                    ai_response = response.choices[0].message.content
                else:
                    error_msg = "错误: API返回了空的响应内容。"
                    return safe_return_with_image(error_msg)
            elif isinstance(response, str):
                ai_response = response # The response is already the string content
            else:
                error_msg = f"错误: 收到未知的API响应格式。"
                return safe_return_with_image(error_msg)

            # 验证AI响应内容
            if not ai_response or ai_response.strip() == "":
                error_msg = "错误: AI返回了空的响应内容。"
                print(f"[云岚AI] {error_msg}")
                return safe_return_with_image(error_msg)

            # 6. 返回结果
            # 清理AI响应文本以防止UI错乱
            cleaned_text = clean_text_for_ui(ai_response)
            output_image = create_empty_image()

            # 返回实际使用的种子，这样ComfyUI可以正确处理缓存和刷新
            return (cleaned_text, output_image, actual_seed)

        except openai.APIConnectionError as e:
            error_msg = f"API连接错误: 无法连接到 {base_url or '未定义的URL'}。请检查API URL和网络连接。"
            print(f"[云岚AI] {error_msg} - {e}")
            return safe_return_with_image(error_msg)
        except openai.AuthenticationError as e:
            error_msg = "API认证错误: API Key无效或已过期。请检查设置。"
            print(f"[云岚AI] {error_msg} - {e}")
            return safe_return_with_image(error_msg)
        except openai.RateLimitError as e:
            error_msg = "API速率限制错误: 已超出您的配额。请检查您的账户用量。"
            print(f"[云岚AI] {error_msg} - {e}")
            return safe_return_with_image(error_msg)
        except openai.APIStatusError as e:
            error_msg = f"API状态错误: {e.status_code} - {e.response.text}"
            print(f"[云岚AI] {error_msg}")
            return safe_return_with_image(error_msg)
        except Exception as e:
            error_msg = f"运行对话节点时发生未知错误: {e}"
            print(f"[云岚AI] {error_msg}")
            import traceback
            traceback.print_exc()
            return safe_return_with_image(error_msg)

class YunlanSmartImageSelector:
    MAX_INPUTS = 10  # Set a reasonable maximum for performance

    @classmethod
    def INPUT_TYPES(s):
        optional_inputs = {}
        for i in range(s.MAX_INPUTS):
            optional_inputs[f"图片{i}"] = ("IMAGE",)

        return {
            "required": {
                # This widget will be used by the frontend to control inputs
                "图片数量": ("INT", {"default": 2, "min": 1, "max": s.MAX_INPUTS, "step": 1}),
                # The dropdown options will be dynamically set by JS
                "选择": (list(map(str, range(s.MAX_INPUTS))),),
            },
            "optional": optional_inputs,
        }
        
    # 添加动态输入端口的支持
    @classmethod
    def IS_CHANGED(s, **kwargs):
        return float("NaN")  # 总是重新评估节点

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("图片",)
    FUNCTION = "select_image"
    CATEGORY = "云岚AI"

    def select_image(self, **kwargs):
        # 获取图片数量参数
        image_count = kwargs.get("图片数量", 2)
        image_count = max(1, min(image_count, self.MAX_INPUTS))  # 确保在有效范围内
        
        # 获取选择的图片索引
        selection_str = kwargs.get("选择", "0")
        try:
            # 转换为整数
            selection_idx = int(selection_str)
            # 确保选择的索引在有效范围内
            selection_idx = max(0, min(selection_idx, image_count - 1))
        except (ValueError, TypeError):
            selection_idx = 0  # 转换失败时默认为0
        
        # 获取选择的图片
        selected_image = kwargs.get(f"图片{selection_idx}")

        # 如果选择的图片不可用，返回黑色图像
        if selected_image is None:
            print(f"[云岚AI] 警告: 选择的图片 '{selection_idx}' 未连接或为空，将输出一个黑色图像。")
            empty_img = create_empty_image()
            return (empty_img,) if empty_img is not None else (None,)
        return (selected_image,)


class DynamicImageSelector:
    """
    动态图片选择器
    
    这个节点允许用户从多个输入图片中选择一张传出。主要特点：
    
    1. 动态输入端口: 当所有现有图片端口都有连接时，自动添加新的输入端口
    2. 智能索引选择: 当选择的索引无效时，会自动选择最接近的有效索引
    3. 无需预先设定图片数量，根据实际连接自动调整
    
    使用方法:
    1. 将图片连接到输入端口"图片0"
    2. 随着输入端口连接图片，新的输入端口会自动出现
    3. 通过"选择"控件指定要输出的图片索引
    
    输入:
    - 图片0, 图片1, ...: 可连接多张图片，会动态添加新端口
    - 选择: 整数，指定要输出的图片索引（从0开始）
    
    输出:
    - 图片: 选中的输入图片
    """
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "选择": ("INT", {"default": 0, "min": 0, "max": 999, "step": 1}),
            },
            "hidden": {
                "node_id": "UNIQUE_ID",
            },
        }

    # 动态输入端口支持
    @classmethod
    def IS_CHANGED(s, **kwargs):
        return float("NaN")  # 总是重新评估节点

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("图片",)
    FUNCTION = "select_image"
    CATEGORY = "云岚AI"

    def select_image(self, 选择, node_id=None, **kwargs):
        # 查找所有连接的图片输入
        connected_images = {}
        for key, value in kwargs.items():
            if key.startswith("图片") and value is not None:
                try:
                    index = int(key[2:])  # 提取图片索引
                    connected_images[index] = value
                except ValueError:
                    continue

        # 如果没有连接任何图片，返回黑色图像
        if not connected_images:
            print(f"[云岚AI] 警告: 未连接任何图片输入，将输出一个黑色图像。")
            empty_img = create_empty_image()
            return (empty_img,) if empty_img is not None else (None,)

        # 确定最大索引
        max_index = max(connected_images.keys()) if connected_images else -1
        
        # 确保选择的索引在有效范围内并且对应的图片存在
        valid_indices = sorted(connected_images.keys())
        if not valid_indices:
            selection_idx = 0
        else:
            # 如果选择的索引不在有效范围内，选择最近的有效索引
            if 选择 not in valid_indices:
                # 找到最接近的有效索引
                selection_idx = min(valid_indices, key=lambda x: abs(x - 选择))
            else:
                selection_idx = 选择
        
        # 获取选择的图片
        selected_image = connected_images.get(selection_idx)
        
        # 如果选择的图片不可用（这种情况应该不会发生，因为我们已经检查了），返回黑色图像
        if selected_image is None:
            print(f"[云岚AI] 警告: 选择的图片 '{selection_idx}' 未连接或为空，将输出一个黑色图像。")
            empty_img = create_empty_image()
            return (empty_img,) if empty_img is not None else (None,)
        

        return (selected_image,)


class YunlanImageCombiner:
    """
    图片拼接节点
    
    将两张图片沿指定方向（上、下、左、右）拼接在一起。
    可以设置原图的最大尺寸，超出将等比例缩放。
    
    输入:
    - 原图: 原始图片，将作为基础
    - 拼接图片: 需要拼接到原图上的图片
    - 拼接方向: 选择拼接的方向（上、下、左、右）
    - 原图最大尺寸: 原图的最大尺寸，超出将等比例缩放
    
    输出:
    - 图片: 拼接后的图片
    """
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "原图": ("IMAGE",),
                "拼接图片": ("IMAGE",),
                "拼接方向": (["上", "下", "左", "右"], {"default": "右"}),
                "原图最大尺寸": ("INT", {"default": 512, "min": 64, "max": 4096, "step": 8}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("图片",)
    FUNCTION = "combine_images"
    CATEGORY = "云岚AI"

    def combine_images(self, 原图, 拼接图片, 拼接方向, 原图最大尺寸):
        # 检查依赖
        if Image is None:
            error_msg = "错误: PIL库未安装，请运行: pip install Pillow>=8.0.0"
            print(f"[云岚AI] {error_msg}")
            return safe_return_with_image(error_msg)

        if torch is None or np is None:
            error_msg = "错误: PyTorch或NumPy库未安装"
            print(f"[云岚AI] {error_msg}")
            return safe_return_with_image(error_msg)

        try:
            # 转换为PIL图像进行处理
            base_img = self.tensor_to_pil(原图)
            append_img = self.tensor_to_pil(拼接图片)
        except Exception as e:
            error_msg = f"错误: 转换图像时发生错误 - {e}"
            print(f"[云岚AI] {error_msg}")
            return safe_return_with_image(error_msg)
        
        # 调整原图大小，保持纵横比
        base_img = self.resize_keep_aspect_ratio(base_img, 原图最大尺寸)
        
        # 根据拼接方向调整拼接图片的高度或宽度
        if 拼接方向 == "上" or 拼接方向 == "下":
            # 调整拼接图片宽度与原图一致
            new_width = base_img.width
            ratio = new_width / append_img.width
            new_height = int(append_img.height * ratio)
            # 使用LANCZOS或BICUBIC，取决于PIL版本
            resize_method = getattr(Image, "LANCZOS", Image.BICUBIC)
            append_img = append_img.resize((new_width, new_height), resize_method)
        else:  # 左或右
            # 调整拼接图片高度与原图一致
            new_height = base_img.height
            ratio = new_height / append_img.height
            new_width = int(append_img.width * ratio)
            # 使用LANCZOS或BICUBIC，取决于PIL版本
            resize_method = getattr(Image, "LANCZOS", Image.BICUBIC)
            append_img = append_img.resize((new_width, new_height), resize_method)
        
        # 创建新图像并拼接
        if 拼接方向 == "上":
            new_img = Image.new('RGB', (base_img.width, base_img.height + append_img.height))
            new_img.paste(append_img, (0, 0))
            new_img.paste(base_img, (0, append_img.height))
        elif 拼接方向 == "下":
            new_img = Image.new('RGB', (base_img.width, base_img.height + append_img.height))
            new_img.paste(base_img, (0, 0))
            new_img.paste(append_img, (0, base_img.height))
        elif 拼接方向 == "左":
            new_img = Image.new('RGB', (base_img.width + append_img.width, base_img.height))
            new_img.paste(append_img, (0, 0))
            new_img.paste(base_img, (append_img.width, 0))
        else:  # 右
            new_img = Image.new('RGB', (base_img.width + append_img.width, base_img.height))
            new_img.paste(base_img, (0, 0))
            new_img.paste(append_img, (base_img.width, 0))
        
        # 转换回tensor并返回
        return (self.pil_to_tensor(new_img),)
    
    def tensor_to_pil(self, tensor):
        # 转换tensor为PIL图像
        if torch is None or np is None or Image is None:
            raise ImportError("缺少必要的库: PyTorch, NumPy 或 PIL")

        i = 255. * tensor.cpu().numpy().squeeze()
        img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
        return img

    def pil_to_tensor(self, image):
        # 转换PIL图像回tensor
        if torch is None or np is None:
            raise ImportError("缺少必要的库: PyTorch 或 NumPy")

        image = np.array(image).astype(np.float32) / 255.0
        image = torch.from_numpy(image)[None,]
        return image
    
    def resize_keep_aspect_ratio(self, image, max_size):
        # 等比例缩放图像，使其最大边长不超过max_size
        width, height = image.size
        
        # 如果图像尺寸已经小于max_size，则不需要缩放
        if width <= max_size and height <= max_size:
            return image
        
        # 确定缩放比例
        if width > height:
            new_width = max_size
            new_height = int(height * max_size / width)
        else:
            new_height = max_size
            new_width = int(width * max_size / height)
        
        # 缩放图像
        # 使用LANCZOS或BICUBIC，取决于PIL版本
        resize_method = getattr(Image, "LANCZOS", Image.BICUBIC)
        return image.resize((new_width, new_height), resize_method)


class DynamicTextSelector:
    """
    动态文本选择器
    
    这个节点允许用户从多个输入文本中选择一个传出。主要特点：
    
    1. 动态输入端口: 当所有现有文本端口都有连接时，自动添加新的输入端口
    2. 智能索引选择: 当选择的索引无效时，会自动选择最接近的有效索引
    3. 无需预先设定文本数量，根据实际连接自动调整
    4. 动态减少端口: 未连接的输入端口会自动减少，仅保留一个空端口
    5. 动态限制选择范围: 根据实际连接的文本数量动态调整选择上限
    
    使用方法:
    1. 将文本连接到输入端口"文本0"
    2. 随着输入端口连接文本，新的输入端口会自动出现
    3. 通过"选择"控件指定要输出的文本索引
    
    输入:
    - 文本0, 文本1, ...: 可连接多个文本，会动态添加新端口
    - 选择: 整数，指定要输出的文本索引（从0开始）
    
    输出:
    - 文本: 选中的输入文本
    """
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "选择": ("INT", {"default": 0, "min": 0, "max": 999, "step": 1}),
            },
            "hidden": {
                "node_id": "UNIQUE_ID",
            },
        }

    # 动态输入端口支持
    @classmethod
    def IS_CHANGED(s, **kwargs):
        return float("NaN")  # 总是重新评估节点

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("文本",)
    FUNCTION = "select_text"
    CATEGORY = "云岚AI"

    def select_text(self, 选择, node_id=None, **kwargs):
        # 查找所有连接的文本输入
        connected_texts = {}
        for key, value in kwargs.items():
            if key.startswith("文本") and value is not None:
                try:
                    index = int(key[2:])  # 提取文本索引
                    connected_texts[index] = value
                except ValueError:
                    continue

        # 如果没有连接任何文本，返回空字符串
        if not connected_texts:
            print(f"[云岚AI] 警告: 未连接任何文本输入，将输出一个空字符串。")
            return ("",)

        # 获取所有有效的索引并排序
        valid_indices = sorted(connected_texts.keys())
        
        # 如果选择的索引不在有效范围内，选择最接近的有效索引
        if 选择 not in valid_indices:
            # 找到最接近的有效索引
            selection_idx = min(valid_indices, key=lambda x: abs(x - 选择))
        else:
            selection_idx = 选择
        
        # 获取选择的文本
        selected_text = connected_texts[selection_idx]
        

        return (selected_text,)


NODE_CLASS_MAPPINGS = {
    "云岚_AI对话": YunlanAIDialog,
    "云岚_条件选图": DynamicImageSelector,
    "云岚_条件选词": DynamicTextSelector,
    "云岚_拼图": YunlanImageCombiner,

}

NODE_DISPLAY_NAME_MAPPINGS = {
    "云岚_AI对话": "云岚_AI对话",
    "云岚_条件选图": "云岚_条件选图",
    "云岚_条件选词": "云岚_条件选词",
    "云岚_拼图": "云岚_拼图",

}