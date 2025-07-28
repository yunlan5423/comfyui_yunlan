# ComfyUI-YunLanFY

一个功能丰富的ComfyUI自定义节点集合，旨在增强ComfyUI的功能和使用体验。

## 功能特点

- **文本处理节点**: 提供文本连接、JSON转换等功能
- **图像处理节点**: 提供图像效果处理、图像信息获取等功能
- **自定义UI**: 美观的节点样式和交互界面
- **易于扩展**: 模块化设计，便于添加新功能

## 安装方法

### 方法一：使用ComfyUI Manager

1. 在ComfyUI中安装并启用ComfyUI Manager
2. 在Manager中搜索"YunLanFY"并点击安装

### 方法二：手动安装

```bash
cd /path/to/ComfyUI/custom_nodes
git clone https://github.com/yunlanfy/comfyui_yunlanfy.git
cd comfyui_yunlanfy
# 如果需要安装依赖（目前无特殊依赖）
# pip install -r requirements.txt
```

## 节点介绍

### 文本处理

- **文本连接 (TextConcatenate)**: 连接两段文本，可自定义分隔符
- **文本转JSON (TextToJson)**: 将文本字符串转换为格式化的JSON

### 图像处理

- **图像信息 (ImageInfo)**: 获取图像的基本信息（尺寸、通道等）
- **简单图像效果 (SimpleImageEffect)**: 提供亮度调整、反色、灰度转换等简单图像效果

## 使用示例

### 文本处理示例

1. 添加"文本连接"节点
2. 设置两个输入文本和分隔符
3. 连接到其他需要文本输入的节点（如提示词）

### 图像处理示例

1. 添加"简单图像效果"节点
2. 将图像连接到节点输入
3. 选择效果类型并调整强度
4. 将处理后的图像连接到其他节点（如保存图像）

## 开发指南

### 项目结构

```
comfyui_yunlanfy/
├── nodes/             # Python节点代码
│   ├── basic_nodes.py # 基础节点集合
│   └── template_node.py # 节点模板
├── js/                # 前端JavaScript代码
│   └── yunlanfy.js    # 前端界面和交互
├── __init__.py        # 插件入口文件
└── README.md          # 项目说明
```

### 添加新节点

1. 在`nodes`目录创建新的Python文件或在现有文件中添加新节点类
2. 遵循ComfyUI节点的格式规范编写节点类
3. 在节点类中定义`INPUT_TYPES`、`RETURN_TYPES`和执行函数
4. 在文件底部注册节点到`NODE_CLASS_MAPPINGS`和`NODE_DISPLAY_NAME_MAPPINGS`

### 前端自定义

在`js/yunlanfy.js`中可以添加自定义UI组件和交互逻辑。

## 许可证

MIT

## 联系方式

GitHub: [https://github.com/yunlanfy/comfyui_yunlanfy](https://github.com/yunlanfy/comfyui_yunlanfy)

如有问题或建议，请提交Issue或PR。 