"""
ComfyUI自定义节点模板
这个文件提供了创建ComfyUI自定义节点的基本结构
"""

class TemplateNode:
    """
    模板节点类
    这是一个创建ComfyUI节点的基本示例
    """
    
    @classmethod
    def INPUT_TYPES(s):
        """
        定义节点的输入类型
        required: 必需的输入
        optional: 可选的输入
        """
        return {
            "required": {
                "input_text": ("STRING", {"default": "Hello ComfyUI", "multiline": True}),
                "input_number": ("INT", {"default": 1, "min": 0, "max": 100}),
            },
            "optional": {
                "optional_input": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.01}),
            }
        }
    
    RETURN_TYPES = ("STRING", "INT")
    RETURN_NAMES = ("output_text", "output_number")
    
    FUNCTION = "process"  # 执行时调用的方法名
    
    # 节点的分类，会显示在ComfyUI的节点菜单中
    CATEGORY = "yunlanfy"
    
    # 是否为输出节点（如保存图像、展示结果等）
    OUTPUT_NODE = False
    
    # 节点的描述信息（会在鼠标悬停时显示）
    DESCRIPTION = "这是一个模板节点，演示如何创建ComfyUI自定义节点"
    
    def process(self, input_text, input_number, optional_input=0.5):
        """
        节点的处理逻辑
        参数名必须与INPUT_TYPES中定义的名称匹配
        """
        # 在这里编写节点的处理逻辑
        result_text = f"{input_text} - Processed with factor: {optional_input}"
        result_number = input_number * 2
        
        # 返回的字典键名必须与RETURN_TYPES对应
        return (result_text, result_number)

# 注册节点
NODE_CLASS_MAPPINGS = {
    "TemplateNode": TemplateNode
}

# 自定义节点在UI中显示的名称
NODE_DISPLAY_NAME_MAPPINGS = {
    "TemplateNode": "模板节点"
} 