# ComfyUI-云岚AI 部署指南

本指南说明如何将项目部署到GitHub并通过ComfyUI Manager进行分发。

## 📋 准备工作检查清单

### ✅ 已完成的文件

- [x] `README.md` - 项目说明文档
- [x] `requirements.txt` - Python依赖列表
- [x] `pyproject.toml` - 项目配置文件
- [x] `node_list.json` - 节点信息文件
- [x] `install.py` - 自动安装脚本
- [x] `LICENSE` - MIT许可证
- [x] `MANIFEST.in` - 包含文件清单
- [x] `.gitignore` - Git忽略文件
- [x] `__init__.py` - 插件入口（已更新元数据）

### ✅ GitHub用户名更新

所有文件中的GitHub用户名已更新为：`yunlan5423`

## 🚀 部署步骤

### 1. 创建GitHub仓库

1. 登录GitHub账号 `yunlan5423`
2. 创建新仓库：`comfyui_yunlan`
3. 设置为公开仓库
4. 不要初始化README（我们已经有了）

### 2. 上传代码到GitHub

```bash
# 在项目目录中执行
git init
git add .
git commit -m "Initial commit: ComfyUI-云岚AI v1.0.0"
git branch -M main
git remote add origin https://github.com/yunlan5423/comfyui_yunlan.git
git push -u origin main
```

### 3. 创建Release

1. 在GitHub仓库页面点击"Releases"
2. 点击"Create a new release"
3. Tag version: `v1.0.0`
4. Release title: `ComfyUI-云岚AI v1.0.0`
5. 描述中包含功能特性和安装说明
6. 发布Release

### 4. 提交到ComfyUI Manager

#### 方法一：通过ComfyUI Manager Registry

1. Fork [ComfyUI-Manager](https://github.com/ltdrdata/ComfyUI-Manager) 仓库
2. 编辑 `custom-node-list.json` 文件
3. 添加以下条目：

```json
{
    "author": "yunlan5423",
    "title": "ComfyUI-云岚AI",
    "reference": "https://github.com/yunlan5423/comfyui_yunlan",
    "files": [
        "https://github.com/yunlan5423/comfyui_yunlan"
    ],
    "install_type": "git-clone",
    "description": "一个功能丰富的ComfyUI自定义节点集合，专注于AI对话和智能图像处理功能。包含AI对话、智能图像选择、文本选择和图像拼接等功能。"
}
```

4. 提交Pull Request

#### 方法二：等待自动发现

ComfyUI Manager会定期扫描GitHub上的ComfyUI插件，如果项目结构正确，会自动被发现。

## 🔍 验证清单

### ComfyUI Manager兼容性检查

- [x] 包含 `__init__.py` 且有正确的节点映射
- [x] 包含 `requirements.txt` 列出所有依赖
- [x] 包含 `pyproject.toml` 项目配置
- [x] 包含 `node_list.json` 节点信息
- [x] 包含 `install.py` 自动安装脚本
- [x] 包含 `README.md` 详细说明
- [x] 包含 `LICENSE` 许可证文件
- [x] GitHub仓库为公开状态
- [x] 有正确的Release标签

### 功能验证

- [x] 节点可以正常加载
- [x] 依赖检查机制工作正常
- [x] 错误处理健壮
- [x] 前端界面正常

## 📝 用户安装说明

用户可以通过以下方式安装：

### 通过ComfyUI Manager（推荐）

1. 打开ComfyUI
2. 安装ComfyUI Manager（如果还没有）
3. 在Manager中搜索"云岚AI"或"yunlan5423"
4. 点击安装
5. 重启ComfyUI

### 手动安装

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/yunlan5423/comfyui_yunlan.git
cd comfyui_yunlan
pip install -r requirements.txt
```

## 🎯 后续维护

1. **版本更新**：更新版本号并创建新的Release
2. **依赖更新**：及时更新requirements.txt
3. **文档维护**：保持README.md的准确性
4. **问题处理**：及时回应GitHub Issues
5. **功能扩展**：根据用户反馈添加新功能

## 📞 支持

- GitHub Issues: https://github.com/yunlan5423/comfyui_yunlan/issues
- 项目主页: https://github.com/yunlan5423/comfyui_yunlan
