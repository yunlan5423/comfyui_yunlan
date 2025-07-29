/**
 * 云岚AI 前端组件
 * 为ComfyUI自定义节点提供前端界面和交互功能
 */

// 注册自定义组件
import { app } from "../../scripts/app.js";

console.log("[云岚AI] yunlanfy.js 文件已加载");

// 使用全局提示词管理系统
// prompt_manager.js会将promptManager导出到window.yunlanPromptManager

// 获取提示词管理器实例
function getPromptManager() {
    // 如果全局实例不存在，创建一个临时的基础版本
    if (!window.yunlanPromptManager) {
        console.warn("[云岚AI] 提示词管理器未找到，使用基础版本");
        
        // 基础版提示词管理器
        window.yunlanPromptManager = {
    prompts: {},
            favorites: [],
            recentlyUsed: [],
            categories: ["全部"],
    
    async loadPrompts() {
        try {
            const response = await fetch('/yunlan/prompts/load');
            if (response.ok) {
                this.prompts = await response.json();
                return this.prompts;
            }
        } catch (e) {
            console.error("[云岚AI] 加载提示词失败:", e);
        }
        return {};
    },
    
    async savePrompts() {
        try {
            const response = await fetch('/yunlan/prompts/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.prompts)
            });
            if (!response.ok) throw new Error("保存提示词失败");
            return true;
        } catch (e) {
            console.error("[云岚AI] 保存提示词失败:", e);
            return false;
        }
    },
    
            getAllPromptNames() {
                return Object.keys(this.prompts);
            },
            
            getPromptsByCategory() {
                return this.getAllPromptNames();
            },
            
            getDisplayName(name) {
                return name;
            },
            
    async addPrompt(name, content) {
        if (!name || !content) return false;
        await this.loadPrompts();
        this.prompts[name] = content;
        return await this.savePrompts();
    },
    
    async deletePrompt(name) {
        if (!name || name === "默认提示词") return false;
        await this.loadPrompts();
        if (this.prompts[name]) {
            delete this.prompts[name];
            return await this.savePrompts();
        }
        return false;
    },
    
    async editPrompt(oldName, newName, content) {
        if (!oldName || !newName || !content) return false;
        await this.loadPrompts();
        if (oldName !== newName) {
            delete this.prompts[oldName];
        }
        this.prompts[newName] = content;
        return await this.savePrompts();
            },
            
            isFavorite() {
                return false;
            },
            
            async toggleFavorite() {
                return true;
            },
            
            async markAsRecentlyUsed() {
                return true;
            }
        };
    }
    
    return window.yunlanPromptManager;
}

// 更新提示词下拉框
async function updatePromptDropdown(widget) {
    if (!widget) return;
    
    try {
        // 获取最新的提示词列表
        const response = await fetch('/yunlan/prompts/names');
        if (response.ok) {
            const promptNames = await response.json();
            if (Array.isArray(promptNames) && promptNames.length > 0) {
                // 保存当前选中的值
                const currentValue = widget.value;
                
                // 更新下拉框选项
                widget.options.values = promptNames;
                
                // 如果当前值不在新列表中，选择第一个选项
                if (!promptNames.includes(currentValue)) {
                    widget.value = promptNames[0];
                } else {
                    widget.value = currentValue;
                }
                
                // 通知ComfyUI更新画布
                if (widget.node && widget.node.graph) {
                    widget.node.graph.setDirtyCanvas(true, true);
                }
            }
        }
    } catch (e) {
        console.error("[云岚AI] 更新提示词下拉框失败:", e);
    }
}

// 注册到ComfyUI
app.registerExtension({
    name: "yunlanfy.prompt_manager",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // 检查是否为我们的节点
        if (nodeData.name === "云岚_AI对话") {
            // 保存原始的onNodeCreated和onExecuted函数
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            const onExecuted = nodeType.prototype.onExecuted;
            
            // 重写onNodeCreated函数
            nodeType.prototype.onNodeCreated = function() {
                // 调用原始函数
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // 查找所有相关的widget
                const promptWidget = this.widgets.find(w => w.name === "提示词");
                const additionalTextWidget = this.widgets.find(w => w.name === "附加文本");
                const modelWidget = this.widgets.find(w => w.name === "模型");
                const seedModeWidget = this.widgets.find(w => w.name === "种子模式");
                const seedWidget = this.widgets.find(w => w.name === "种子");
                
                // 创建提示词预览区域
                if (promptWidget && additionalTextWidget) {
                    // 创建预览容器
                    const previewContainer = document.createElement("div");
                    previewContainer.className = "yunlan-prompt-preview";
                    previewContainer.style.cssText = `
                        background-color: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 4px;
                        padding: 8px;
                        margin-top: 10px;
                        margin-bottom: 10px;
                        font-size: 12px;
                        color: #ddd;
                        max-height: 120px;
                        overflow-y: auto;
                    `;
                    
                    // 更新预览内容的函数
                    const updatePreview = async () => {
                        const pm = getPromptManager();
                        await pm.loadPrompts();
                        
                        const selectedPrompt = promptWidget.value;
                        const additionalText = additionalTextWidget.value || "";
                        const selectedModel = modelWidget ? modelWidget.value : "未选择模型";
                        
                        // 获取完整提示词内容
                        const promptContent = pm.prompts[selectedPrompt] || selectedPrompt;
                        const fullPrompt = promptContent + additionalText;
                        
                        // 安全地构建预览内容（防止HTML注入）
                        const escapeHtml = (text) => {
                            const div = document.createElement('div');
                            div.textContent = text;
                            return div.innerHTML;
                        };

                        // 构建预览内容
                        let previewText = `<strong>模型:</strong> ${escapeHtml(selectedModel)}<br>`;
                        previewText += `<strong>提示词:</strong> ${escapeHtml(promptContent)}<br>`;
                        if (additionalText) {
                            previewText += `<strong>附加文本:</strong> ${escapeHtml(additionalText)}<br>`;
                        }
                        previewText += `<strong>完整提示:</strong> ${escapeHtml(fullPrompt)}`;

                        // 更新预览内容
                        previewContainer.innerHTML = previewText;
                    };
                    
                    // 初始更新预览
                    updatePreview();
                    
                    // 添加事件监听器，当提示词或附加文本变化时更新预览
                    promptWidget.callback_after_update = () => {
                        updatePreview();
                    };
                    
                    additionalTextWidget.callback_after_update = () => {
                        updatePreview();
                    };
                    
                    // 将预览容器添加到节点中
                    // 找到附加文本控件的容器
                    if (additionalTextWidget.element && additionalTextWidget.element.parentElement) {
                        const widgetContainer = additionalTextWidget.element.parentElement.parentElement;
                        if (widgetContainer) {
                            // 在附加文本控件后插入预览容器
                            widgetContainer.insertBefore(previewContainer, additionalTextWidget.element.parentElement.nextSibling);
                        }
                    }
                }
                
                if (promptWidget) {
                    // 添加提示词管理按钮
                    const buttonContainer = document.createElement("div");
                    buttonContainer.style.cssText = `
                        display: inline-block;
                        vertical-align: middle;
                        margin-left: 5px;
                    `;
                    
                    const manageButton = document.createElement("button");
                    manageButton.textContent = "管理提示词";
                    manageButton.style.cssText = `
                        background-color: #4F7CAC;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 3px 8px;
                        cursor: pointer;
                        font-size: 12px;
                    `;
                    
                    manageButton.onclick = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        createPromptDialog(this, promptWidget);
                    };
                    
                    buttonContainer.appendChild(manageButton);
                    
                    // 添加刷新按钮
                    const refreshButton = document.createElement("button");
                    refreshButton.textContent = "刷新";
                    refreshButton.style.cssText = `
                        background-color: #5A9E6F;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 3px 8px;
                        cursor: pointer;
                        font-size: 12px;
                        margin-left: 5px;
                    `;
                    
                    refreshButton.onclick = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        updatePromptDropdown(promptWidget);
                    };
                    
                    buttonContainer.appendChild(refreshButton);
                    
                    // 将按钮添加到提示词下拉框旁边
                    if (promptWidget.element && promptWidget.element.parentElement) {
                        promptWidget.element.parentElement.appendChild(buttonContainer);
                    }
                    
                    // 初始加载时更新一次
                    updatePromptDropdown(promptWidget);
                }
            };

            // 添加节点执行完成后的回调，用于更新随机种子
            nodeType.prototype.onExecuted = function(message) {
                // 调用原始的onExecuted函数
                if (onExecuted) {
                    onExecuted.apply(this, arguments);
                }

                // 查找种子相关的widget
                const seedModeWidget = this.widgets.find(w => w.name === "种子模式");
                const seedWidget = this.widgets.find(w => w.name === "种子");

                // 如果是随机模式，更新种子值
                if (seedModeWidget && seedWidget && seedModeWidget.value === "随机") {
                    // 生成新的随机种子
                    const newSeed = Math.floor(Math.random() * 0xffffffffffffffff);

                    // 更新种子widget的值
                    seedWidget.value = newSeed;

                    // 触发widget更新事件
                    if (seedWidget.callback) {
                        seedWidget.callback(newSeed);
                    }

                    // 标记画布需要重绘
                    if (this.graph) {
                        this.graph.setDirtyCanvas(true, true);
                    }

                    console.log(`[云岚AI] 随机种子已更新: ${newSeed}`);
                }
            };
        }

        // --- 逻辑 for 云岚_智能选图 ---
        if (nodeData.name === "云岚_智能选图") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                // 获取选择器组件
                const selectionWidget = this.widgets.find(w => w.name === "选择");
                
                // 动态管理输入端口的函数
                const manageDynamicInputs = () => {
                    // 查找所有图片输入端口
                    const imageInputs = this.inputs.filter(input => input.name.startsWith("图片"));
                    
                    // 记录已连接的和未连接的端口
                    const connectedInputs = [];
                    const disconnectedInputs = [];
                    let highestConnectedIndex = -1;
                    
                    // 分析所有图片端口的连接状态
                    for (const input of imageInputs) {
                        try {
                            const index = parseInt(input.name.slice(2));
                            if (input.link !== null) {
                                connectedInputs.push({index, input});
                                highestConnectedIndex = Math.max(highestConnectedIndex, index);
                            } else {
                                disconnectedInputs.push({index, input});
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                    
                    // 记录已连接端口的索引集合，用于选择器更新
                    const connectedIndices = new Set(connectedInputs.map(item => item.index));
                    
                    // 修复选择器的更新
                    if (selectionWidget && connectedIndices.size > 0) {
                        // 将已连接端口的索引排序
                        const connectedArray = Array.from(connectedIndices).sort((a, b) => a - b);
                        
                        // 检查当前选择值是否在连接的索引中
                        const currentValue = parseInt(selectionWidget.value);
                        if (!connectedIndices.has(currentValue)) {
                            // 找到最接近当前值的有效索引
                            let closestIndex = connectedArray[0];
                            let minDistance = Math.abs(currentValue - closestIndex);
                            
                            for (const idx of connectedArray) {
                                const distance = Math.abs(currentValue - idx);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    closestIndex = idx;
                                }
                            }
                            // 更新选择器值为最近的有效索引
                            selectionWidget.value = closestIndex;
                        }
                        
                        // 更新选择器的最大值限制
                        selectionWidget.options.max = highestConnectedIndex;
                    } else if (selectionWidget) {
                        // 如果没有连接的端口，将选择器值重置为0
                        selectionWidget.value = 0;
                    }
                    
                    // 处理端口管理 - 修复方法：不重建所有端口，而是精确添加或删除所需的端口
                    
                    // 1. 确保至少有一个端口
                    if (imageInputs.length === 0) {
                        this.addInput("图片0", "IMAGE");
                        return;
                    }
                    
                    // 2. 确保至少有一个未连接的端口
                    if (disconnectedInputs.length === 0) {
                        const newIndex = highestConnectedIndex + 1;
                        this.addInput(`图片${newIndex}`, "IMAGE");
                        
                        // 关键修复：添加新端口后不要立即返回，继续处理布局
                        // 强制重新计算节点尺寸
                        this.setSize(this.computeSize());
                        
                        // 通知画布更新
                        if (this.graph) {
                            this.graph.setDirtyCanvas(true, true);
                        }
                        return;
                    }
                    
                    // 3. 如果有多余的未连接端口，只保留一个（索引最小的）
                    if (disconnectedInputs.length > 1) {
                        // 按索引排序，保留最小索引的未连接端口
                        disconnectedInputs.sort((a, b) => a.index - b.index);
                        
                        // 从高索引开始删除多余的未连接端口，避免索引变化影响删除操作
                        for (let i = disconnectedInputs.length - 1; i > 0; i--) {
                            const input = disconnectedInputs[i];
                            const inputIndex = this.inputs.indexOf(input.input);
                            if (inputIndex !== -1) {
                                this.removeInput(inputIndex);
                            }
                        }
                    }
                    
                    // 强制更新节点布局
                    this.setSize(this.computeSize());
                    
                    // 通知画布更新
                    if (this.graph) {
                        this.graph.setDirtyCanvas(true, true);
                    }
                };
                
                // 监听连接变化事件
                const onConnectionsChange = this.onConnectionsChange;
                this.onConnectionsChange = function(type, slotIndex, connected, link_info) {
                    // 调用原始方法
                    if (onConnectionsChange) {
                        onConnectionsChange.apply(this, arguments);
                    }
                    
                    // 当连接变化时管理动态输入端口
                    if (type === LiteGraph.INPUT) {
                        // 使用setTimeout确保连接状态已更新
                        setTimeout(() => {
                            manageDynamicInputs();
                            
                            // 通知 ComfyUI 该节点需要重新执行
                            if (this.graph && this.graph.onNodeConnectionChange) {
                                this.graph.onNodeConnectionChange(this);
                            }
                            
                            // 关键修复：额外的延时处理，确保节点布局完全更新
                            setTimeout(() => {
                                this.setSize(this.computeSize());
                                if (this.graph) {
                                    this.graph.setDirtyCanvas(true, true);
                                }
                            }, 50);
                        }, 10);
                    }
                };
                
                // 初始化
                setTimeout(() => {
                    manageDynamicInputs();
                    // 确保初始化后节点布局正确
                    this.setSize(this.computeSize());
                    if (this.graph) {
                        this.graph.setDirtyCanvas(true, true);
                    }
                }, 100);
                
                return r;
            };
        }
        
        // --- 逻辑 for 云岚_条件选词 ---
        if (nodeData.name === "云岚_条件选词") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                // 获取选择器组件
                const selectionWidget = this.widgets.find(w => w.name === "选择");
                
                // 动态管理输入端口的函数
                const manageDynamicInputs = () => {
                    // 查找所有文本输入端口
                    const textInputs = this.inputs.filter(input => input.name.startsWith("文本"));
                    
                    // 记录已连接的和未连接的端口
                    const connectedInputs = [];
                    const disconnectedInputs = [];
                    let highestConnectedIndex = -1;
                    
                    // 分析所有文本端口的连接状态
                    for (const input of textInputs) {
                        try {
                            const index = parseInt(input.name.slice(2));
                            if (input.link !== null) {
                                connectedInputs.push({index, input});
                                highestConnectedIndex = Math.max(highestConnectedIndex, index);
                            } else {
                                disconnectedInputs.push({index, input});
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                    
                    // 记录已连接端口的索引集合，用于选择器更新
                    const connectedIndices = new Set(connectedInputs.map(item => item.index));
                    
                    // 修复选择器的更新
                    if (selectionWidget && connectedIndices.size > 0) {
                        // 将已连接端口的索引排序
                        const connectedArray = Array.from(connectedIndices).sort((a, b) => a - b);
                        
                        // 检查当前选择值是否在连接的索引中
                        const currentValue = parseInt(selectionWidget.value);
                        if (!connectedIndices.has(currentValue)) {
                            // 找到最接近当前值的有效索引
                            let closestIndex = connectedArray[0];
                            let minDistance = Math.abs(currentValue - closestIndex);
                            
                            for (const idx of connectedArray) {
                                const distance = Math.abs(currentValue - idx);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    closestIndex = idx;
                                }
                            }
                            // 更新选择器值为最近的有效索引
                            selectionWidget.value = closestIndex;
                        }
                        
                        // 更新选择器的最大值限制
                        selectionWidget.options.max = highestConnectedIndex;
                    } else if (selectionWidget) {
                        // 如果没有连接的端口，将选择器值重置为0
                        selectionWidget.value = 0;
                    }
                    
                    // 处理端口管理 - 修复方法：不重建所有端口，而是精确添加或删除所需的端口
                    
                    // 1. 确保至少有一个端口
                    if (textInputs.length === 0) {
                        this.addInput("文本0", "STRING");
                        return;
                    }
                    
                    // 2. 确保至少有一个未连接的端口
                    if (disconnectedInputs.length === 0) {
                        const newIndex = highestConnectedIndex + 1;
                        this.addInput(`文本${newIndex}`, "STRING");
                        
                        // 关键修复：添加新端口后不要立即返回，继续处理布局
                        // 强制重新计算节点尺寸
                        this.setSize(this.computeSize());
                        
                        // 通知画布更新
                        if (this.graph) {
                            this.graph.setDirtyCanvas(true, true);
                        }
                        return;
                    }
                    
                    // 3. 如果有多余的未连接端口，只保留一个（索引最小的）
                    if (disconnectedInputs.length > 1) {
                        // 按索引排序，保留最小索引的未连接端口
                        disconnectedInputs.sort((a, b) => a.index - b.index);
                        
                        // 从高索引开始删除多余的未连接端口，避免索引变化影响删除操作
                        for (let i = disconnectedInputs.length - 1; i > 0; i--) {
                            const input = disconnectedInputs[i];
                            const inputIndex = this.inputs.indexOf(input.input);
                            if (inputIndex !== -1) {
                                this.removeInput(inputIndex);
                            }
                        }
                    }
                    
                    // 强制更新节点布局
                    this.setSize(this.computeSize());
                    
                    // 通知画布更新
                    if (this.graph) {
                        this.graph.setDirtyCanvas(true, true);
                    }
                };
                
                // 监听连接变化事件
                const onConnectionsChange = this.onConnectionsChange;
                this.onConnectionsChange = function(type, slotIndex, connected, link_info) {
                    // 调用原始方法
                    if (onConnectionsChange) {
                        onConnectionsChange.apply(this, arguments);
                    }
                    
                    // 当连接变化时管理动态输入端口
                    if (type === LiteGraph.INPUT) {
                        // 使用setTimeout确保连接状态已更新
                        setTimeout(() => {
                            manageDynamicInputs();
                            
                            // 通知 ComfyUI 该节点需要重新执行
                            if (this.graph && this.graph.onNodeConnectionChange) {
                                this.graph.onNodeConnectionChange(this);
                            }
                            
                            // 关键修复：额外的延时处理，确保节点布局完全更新
                            setTimeout(() => {
                                this.setSize(this.computeSize());
                                if (this.graph) {
                                    this.graph.setDirtyCanvas(true, true);
                                }
                            }, 50);
                        }, 10);
                    }
                };
                
                // 初始化
                setTimeout(() => {
                    manageDynamicInputs();
                    // 确保初始化后节点布局正确
                    this.setSize(this.computeSize());
                    if (this.graph) {
                        this.graph.setDirtyCanvas(true, true);
                    }
                }, 100);
                
                return r;
            };
        }
    },
});

// 创建提示词管理对话框
function createPromptDialog(node, widget) {
    console.log("[云岚AI] 创建提示词管理对话框");
    
    // 如果已存在对话框，先移除
    const existingDialog = document.querySelector(".yunlan-prompt-dialog");
    const existingOverlay = document.querySelector(".yunlan-prompt-overlay");
    if (existingDialog) document.body.removeChild(existingDialog);
    if (existingOverlay) document.body.removeChild(existingOverlay);
    
    // 创建遮罩层，防止事件传递到画布
    let promptOverlay = document.createElement("div");
    promptOverlay.className = "yunlan-prompt-overlay";
    promptOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        pointer-events: all;
    `;
    document.body.appendChild(promptOverlay);
    
    // 创建对话框容器
    const dialog = document.createElement("div");
    dialog.className = "yunlan-prompt-dialog";
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #333;
        border: 2px solid #4F7CAC;
        border-radius: 8px;
        padding: 16px;
        width: 500px;
        max-width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
        z-index: 10000;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        pointer-events: all;
    `;
    
    // 创建关闭对话框的函数
    const closeDialog = () => {
        document.body.removeChild(dialog);
        document.body.removeChild(promptOverlay);
        
        // 更新提示词下拉框
        if (widget) {
            updatePromptDropdown(widget);
            
            // 查找并更新预览区域
            const previewContainer = document.querySelector(".yunlan-prompt-preview");
            if (previewContainer && node) {
                const additionalTextWidget = node.widgets.find(w => w.name === "附加文本");
                const modelWidget = node.widgets.find(w => w.name === "模型");
                
                if (additionalTextWidget && modelWidget) {
                    const pm = getPromptManager();
                    const selectedPrompt = widget.value;
                    const additionalText = additionalTextWidget.value || "";
                    const selectedModel = modelWidget.value;
                    
                    // 获取完整提示词内容
                    const promptContent = pm.prompts[selectedPrompt] || selectedPrompt;
                    const fullPrompt = promptContent + additionalText;
                    
                    // 安全地构建预览内容（防止HTML注入）
                    const escapeHtml = (text) => {
                        const div = document.createElement('div');
                        div.textContent = text;
                        return div.innerHTML;
                    };

                    // 构建预览内容
                    let previewText = `<strong>模型:</strong> ${escapeHtml(selectedModel)}<br>`;
                    previewText += `<strong>提示词:</strong> ${escapeHtml(promptContent)}<br>`;
                    if (additionalText) {
                        previewText += `<strong>附加文本:</strong> ${escapeHtml(additionalText)}<br>`;
                    }
                    previewText += `<strong>完整提示:</strong> ${escapeHtml(fullPrompt)}`;

                    // 更新预览内容
                    previewContainer.innerHTML = previewText;
                }
            }
        }
        
        // 强制更新节点UI
        if (node && node.graph) {
            node.graph.setDirtyCanvas(true, true);
        }
    };
    
    // 阻止所有点击事件传播
    dialog.addEventListener("mousedown", (e) => e.stopPropagation());
    dialog.addEventListener("click", (e) => e.stopPropagation());
    dialog.addEventListener("dblclick", (e) => e.stopPropagation());
    dialog.addEventListener("wheel", (e) => e.stopPropagation());
    promptOverlay.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDialog();
    });
    
    // 创建标题栏
    const titleBar = document.createElement("div");
    titleBar.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #4F7CAC;
    `;
    
    // 创建标题
    const title = document.createElement("h2");
    title.textContent = "提示词管理";
    title.style.cssText = `
        color: #fff;
        margin: 0;
    `;
    titleBar.appendChild(title);
    
    // 创建关闭按钮
    const dialogCloseBtn = document.createElement("button");
    dialogCloseBtn.textContent = "✕";
    dialogCloseBtn.style.cssText = `
        background: none;
        border: none;
        color: #fff;
        font-size: 20px;
        cursor: pointer;
        padding: 0 5px;
    `;
    dialogCloseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDialog();
    });
    titleBar.appendChild(dialogCloseBtn);
    
    dialog.appendChild(titleBar);
    
    // 创建提示词列表容器
    const promptListContainer = document.createElement("div");
    promptListContainer.style.cssText = `
        margin-bottom: 16px;
        max-height: 300px;
        overflow-y: auto;
    `;
    dialog.appendChild(promptListContainer);
    
    // 创建表单
    const form = document.createElement("div");
    form.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 16px;
    `;
    
    // 提示词名称输入
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "提示词名称";
    nameInput.className = "yunlan-styled-widget";
    nameInput.style.cssText = `
        padding: 8px;
        background-color: #444;
        border: 1px solid #555;
        border-radius: 4px;
        color: #fff;
    `;
    form.appendChild(nameInput);
    
    // 提示词内容输入
    const contentInput = document.createElement("textarea");
    contentInput.placeholder = "提示词内容";
    contentInput.className = "yunlan-styled-widget";
    contentInput.style.cssText = `
        padding: 8px;
        background-color: #444;
        border: 1px solid #555;
        border-radius: 4px;
        color: #fff;
        min-height: 100px;
        resize: vertical;
    `;
    form.appendChild(contentInput);
    
    // 按钮容器
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: space-between;
    `;
    
    // 添加按钮
    const addButton = document.createElement("button");
    addButton.textContent = "添加";
    addButton.style.cssText = `
        padding: 8px 16px;
        background-color: #4F7CAC;
        border: none;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        flex: 1;
    `;
    buttonContainer.appendChild(addButton);
    
    // 更新按钮
    const updateButton = document.createElement("button");
    updateButton.textContent = "更新";
    updateButton.style.cssText = `
        padding: 8px 16px;
        background-color: #2D5F8B;
        border: none;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        flex: 1;
    `;
    buttonContainer.appendChild(updateButton);
    
    // 删除按钮
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "删除";
    deleteButton.style.cssText = `
        padding: 8px 16px;
        background-color: #d9534f;
        border: none;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        flex: 1;
    `;
    buttonContainer.appendChild(deleteButton);
    
    // 关闭按钮
    const closeButton = document.createElement("button");
    closeButton.textContent = "关闭";
    closeButton.style.cssText = `
        padding: 8px 16px;
        background-color: #666;
        border: none;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        flex: 1;
    `;
    buttonContainer.appendChild(closeButton);
    
    form.appendChild(buttonContainer);
    dialog.appendChild(form);
    
    // 创建遮罩层
    const overlay = document.createElement("div");
    overlay.className = "yunlan-prompt-overlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
    `;
    
    // 添加对话框和遮罩层到文档，但阻止事件冒泡到画布
    dialog.addEventListener('mousedown', e => e.stopPropagation());
    dialog.addEventListener('mouseup', e => e.stopPropagation());
    dialog.addEventListener('mousemove', e => e.stopPropagation());
    dialog.addEventListener('wheel', e => e.stopPropagation());
    
    // 防止事件冒泡导致画布缩放或移动
    overlay.addEventListener('mousedown', e => e.stopPropagation());
    overlay.addEventListener('mouseup', e => e.stopPropagation());
    overlay.addEventListener('mousemove', e => e.stopPropagation());
    overlay.addEventListener('wheel', e => e.stopPropagation());
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    let selectedPromptName = null;
    let selectedCategory = "全部";
    
    // 创建类别选择器
    const categorySelector = document.createElement("div");
    categorySelector.style.cssText = `
        margin-bottom: 16px;
    `;
    
    const categoryLabel = document.createElement("label");
    categoryLabel.textContent = "类别: ";
    categoryLabel.style.cssText = `
        color: #fff;
        margin-right: 8px;
    `;
    categorySelector.appendChild(categoryLabel);
    
    const categorySelect = document.createElement("select");
    categorySelect.style.cssText = `
        background-color: #444;
        color: #fff;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid #666;
    `;
    
    // 填充类别下拉框
    function populateCategories() {
        const pm = getPromptManager();
        categorySelect.innerHTML = "";
        pm.categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
        
        // 选择之前选中的类别或默认类别
        categorySelect.value = pm.categories.includes(selectedCategory) 
            ? selectedCategory : pm.categories[0];
    }
    
    categorySelect.addEventListener("change", () => {
        selectedCategory = categorySelect.value;
        renderPromptList();
    });
    
    categorySelector.appendChild(categorySelect);
    dialog.insertBefore(categorySelector, promptListContainer);
    
    // 渲染提示词列表
    async function renderPromptList() {
        const pm = getPromptManager();
        await pm.loadPrompts();
        populateCategories();
        
        const prompts = pm.getPromptsByCategory(selectedCategory);
        promptListContainer.innerHTML = "";
        
        prompts.forEach(name => {
            const promptItem = document.createElement("div");
            promptItem.className = "yunlan-prompt-item";
            promptItem.style.cssText = `
                padding: 10px;
                margin-bottom: 8px;
                background-color: #444;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            // 显示名称（如果是分类格式，只显示名称部分）
            const displayName = pm.getDisplayName(name);
            
            const promptName = document.createElement("div");
            promptName.textContent = displayName;
            promptName.style.cssText = `
                font-weight: bold;
                color: #fff;
                flex: 1;
            `;
            
            promptItem.appendChild(promptName);
            
            // 添加收藏按钮
            const favoriteBtn = document.createElement("button");
            favoriteBtn.textContent = pm.isFavorite(name) ? "★" : "☆";
            favoriteBtn.title = pm.isFavorite(name) ? "取消收藏" : "添加到收藏夹";
            favoriteBtn.style.cssText = `
                background: none;
                border: none;
                color: ${pm.isFavorite(name) ? "#FFD700" : "#fff"};
                font-size: 16px;
                cursor: pointer;
                margin-left: 8px;
            `;
            favoriteBtn.onclick = async (e) => {
                e.stopPropagation();
                await pm.toggleFavorite(name);
                renderPromptList();
            };
            promptItem.appendChild(favoriteBtn);
            
            // 阻止事件冒泡
            promptItem.addEventListener('mousedown', e => e.stopPropagation());
            
            promptItem.onclick = async (e) => {
                e.stopPropagation();
                selectedPromptName = name;
                nameInput.value = name;
                contentInput.value = pm.prompts[name];
                
                // 标记为最近使用
                await pm.markAsRecentlyUsed(name);
                
                // 高亮选中的提示词
                document.querySelectorAll(".yunlan-prompt-item").forEach(item => {
                    item.style.border = "none";
                });
                promptItem.style.border = "2px solid #4F7CAC";
            };
            
            promptListContainer.appendChild(promptItem);
        });
    }
    
    // 初始渲染提示词列表
    renderPromptList();
    
    // 添加按钮点击事件
    addButton.onclick = async (e) => {
        e.stopPropagation();
        const name = nameInput.value.trim();
        const content = contentInput.value.trim();
        
        if (!name || !content) {
            alert("提示词名称和内容不能为空");
            return;
        }
        
        const pm = getPromptManager();
        const success = await pm.addPrompt(name, content);
        if (success) {
            await renderPromptList();
            nameInput.value = "";
            contentInput.value = "";
            selectedPromptName = null;
            
            // 更新节点的提示词下拉菜单
            if (widget && widget.options) {
                const index = widget.options.values.indexOf(name);
                if (index === -1) {
                    widget.options.values.push(name);
                    widget.options.values = [...widget.options.values]; // 强制更新
                    app.graph.setDirtyCanvas(true);
                }
            }
        } else {
            alert("添加提示词失败");
        }
    };
    
    // 更新按钮点击事件
    updateButton.onclick = async (e) => {
        e.stopPropagation();
        if (!selectedPromptName) {
            alert("请先选择一个提示词");
            return;
        }
        
        const newName = nameInput.value.trim();
        const content = contentInput.value.trim();
        
        if (!newName || !content) {
            alert("提示词名称和内容不能为空");
            return;
        }
        
        const pm = getPromptManager();
        const success = await pm.editPrompt(selectedPromptName, newName, content);
        if (success) {
            // 标记为最近使用
            await pm.markAsRecentlyUsed(newName);
            await renderPromptList();
            
            // 更新节点的提示词下拉菜单
            if (widget && widget.options) {
                const oldIndex = widget.options.values.indexOf(selectedPromptName);
                if (oldIndex !== -1) {
                    widget.options.values[oldIndex] = newName;
                    widget.options.values = [...widget.options.values]; // 强制更新
                    
                    // 如果当前选中的是被修改的提示词，更新选中值
                    if (widget.value === selectedPromptName) {
                        widget.value = newName;
                    }
                    
                    app.graph.setDirtyCanvas(true);
                }
            }
        } else {
            alert("更新提示词失败");
        }
    };
    
    // 删除按钮点击事件
    deleteButton.onclick = async (e) => {
        e.stopPropagation();
        if (!selectedPromptName) {
            alert("请先选择一个提示词");
            return;
        }
        
        if (selectedPromptName === "默认提示词") {
            alert("默认提示词不能删除");
            return;
        }
        
        if (!confirm(`确定要删除提示词 "${selectedPromptName}" 吗？`)) {
            return;
        }
        
        const pm = getPromptManager();
        const success = await pm.deletePrompt(selectedPromptName);
        if (success) {
            await renderPromptList();
            nameInput.value = "";
            contentInput.value = "";
            selectedPromptName = null;
            
            // 更新节点的提示词下拉菜单
            if (widget && widget.options) {
                const index = widget.options.values.indexOf(selectedPromptName);
                if (index !== -1) {
                    widget.options.values.splice(index, 1);
                    widget.options.values = [...widget.options.values]; // 强制更新
                    
                    // 如果当前选中的是被删除的提示词，重置为第一个选项
                    if (widget.value === selectedPromptName && widget.options.values.length > 0) {
                        widget.value = widget.options.values[0];
                    }
                    
                    app.graph.setDirtyCanvas(true);
                }
            }
        } else {
            alert("删除提示词失败");
        }
    };
    
    // 关闭按钮点击事件
    closeButton.onclick = (e) => {
        e.stopPropagation();
        document.body.removeChild(dialog);
        document.body.removeChild(overlay);
    };
    
    // 点击遮罩层关闭对话框
    overlay.onclick = (e) => {
        e.stopPropagation();
        document.body.removeChild(dialog);
        document.body.removeChild(overlay);
    };

    // 阻止键盘事件传播到画布
    dialog.addEventListener('keydown', e => e.stopPropagation());
    dialog.addEventListener('keyup', e => e.stopPropagation());
}

const extension = {
    name: "Comfy.Yunlan.Settings",
    async setup() {
        console.log("[云岚AI] setup() 已调用");

        const SETTING_PREFIX = "云岚AI.";
        const DEFAULT_API_URL = "https://yunwu.ai/v1/chat/completions";
        const DEFAULT_MODELS = [
            "gpt-4o", "gpt-4o-mini", "gpt-4.1-2025-04-14",
            "gpt-4.1-mini-2025-04-14", "gemini-2.5-pro", "gemini-2.5-flash"
        ];
        let managedModels = [];

        const modelCardContainer = document.createElement("div");
        modelCardContainer.className = "yunlan-model-container";
        const modelDropdown = document.createElement("select");
        modelDropdown.className = "yunlan-styled-widget";
        
        const styleSheet = document.createElement("style");
        styleSheet.textContent = `
            .yunlan-model-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 8px; border: 1px solid #222; border-radius: 4px; max-height: 160px; overflow-y: auto; margin-top: 5px; }
            .yunlan-model-card { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background-color: #353535; border-radius: 4px; font-size: 13px; }
            .yunlan-model-card button { padding: 3px 6px; font-size: 11px; cursor: pointer; border: 1px solid #555; background-color: #444; color: #ddd; border-radius: 3px; }
            .yunlan-model-card button:hover { background-color: #555; border-color: #777; }
            .yunlan-styled-widget { background-color: #333; color: #f0f0f0; border: 1px solid #555; border-radius: 4px; padding: 8px; width: 100%; box-sizing: border-box; margin: 0; }
            .yunlan-styled-widget:focus { border-color: #00aaff; outline: none; }
            .yunlan-action-button { width: 100%; margin-top: 5px; }
            .yunlan-prompt-button { 
                background-color: #4F7CAC; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                padding: 4px 8px; 
                font-size: 12px; 
                cursor: pointer; 
                margin-top: 5px;
                width: 100%;
            }
            .yunlan-prompt-button:hover { background-color: #2D5F8B; }
        `;
        document.head.appendChild(styleSheet);

        async function saveAllSettings() {
            const settingsToSave = {
                apiUrl: app.ui.settings.getSettingValue(`${SETTING_PREFIX}ApiUrl`),
                apiKey: app.ui.settings.getSettingValue(`${SETTING_PREFIX}ApiKey`),
                modelList: managedModels,
                apiModel: modelDropdown.value,
            };
            try {
                const response = await fetch('/yunlan/settings/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settingsToSave)
                });
                if (!response.ok) throw new Error("自动保存请求失败: " + response.status);
            } catch (e) {
                console.error("[云岚AI] 自动保存失败:", e);
            }
        }

        function renderModelUI(newModelList, selectedModel) {
            managedModels = [...newModelList];
            modelCardContainer.innerHTML = "";
            managedModels.forEach(model => modelCardContainer.appendChild(createModelCard(model)));
            modelDropdown.innerHTML = "";
            managedModels.forEach(model => {
                const option = document.createElement("option");
                option.value = model; option.textContent = model;
                modelDropdown.appendChild(option);
            });
            if (selectedModel && managedModels.includes(selectedModel)) {
                modelDropdown.value = selectedModel;
            } else if (managedModels.length > 0) {
                modelDropdown.value = managedModels[0];
            }
        }

        function createModelCard(modelName) {
            const card = document.createElement("div");
            card.className = "yunlan-model-card"; card.textContent = modelName;
            
            // 只有非默认模型才添加删除按钮
            if (!DEFAULT_MODELS.includes(modelName)) {
                const deleteButton = document.createElement("button");
                deleteButton.textContent = "删除";
                deleteButton.onclick = () => {
                    renderModelUI(managedModels.filter(m => m !== modelName), modelDropdown.value);
                    saveAllSettings();
                };
                card.appendChild(deleteButton);
            }
            return card;
        }
        
        function onAddModel() {
            const newModel = prompt("请输入要添加的模型名称:");
            if (newModel && newModel.trim() && !managedModels.includes(newModel.trim())) {
                renderModelUI([...managedModels, newModel.trim()], modelDropdown.value);
                saveAllSettings();
            }
        }
        
        modelDropdown.onchange = saveAllSettings;

        // --- UI Settings Registration (New Order) ---
        
        app.ui.settings.addSetting({
            id: `${SETTING_PREFIX}ApiKey`, name: "API 密钥",
            type: (key, setter, value) => {
                const textInput = document.createElement("input");
                textInput.type = "text"; textInput.className = "yunlan-styled-widget";
                textInput.value = value;
                textInput.onchange = () => { setter(textInput.value); saveAllSettings(); };
                return textInput;
            },
            defaultValue: "",
        });

        app.ui.settings.addSetting({
            id: `${SETTING_PREFIX}ApiUrl`, name: "API 地址",
            type: (key, setter, value) => {
                const textInput = document.createElement("input");
                textInput.type = "text"; textInput.className = "yunlan-styled-widget";
                textInput.value = value;
                textInput.onchange = () => { setter(textInput.value); saveAllSettings(); };
                return textInput;
            },
            defaultValue: DEFAULT_API_URL,
        });

        app.ui.settings.addSetting({
            id: `${SETTING_PREFIX}ApiModel`, name: "当前模型",
            type: () => modelDropdown, defaultValue: "",
        });

        app.ui.settings.addSetting({
            id: `${SETTING_PREFIX}ModelManager`, name: "模型列表",
            type: () => {
                const container = document.createElement("div");
                container.style.width = "100%";
                container.appendChild(modelCardContainer);
                const addButton = document.createElement("button");
                addButton.textContent = "添加模型";
                addButton.className = "yunlan-action-button";
                addButton.onclick = onAddModel;
                container.appendChild(addButton);
                return container;
            }
        });

        // --- Initial Load ---
        (async () => {
            try {
                const OLD_DEFAULT_API_URL = "https://yunwu.ai/v1/chat/completions";
                const response = await fetch('/yunlan/settings/load');
                let settings = {};
                if (response.ok) settings = await response.json();
                
                // One-time migration for the API URL
                let loadedApiUrl = settings.apiUrl;
                if (loadedApiUrl === OLD_DEFAULT_API_URL) {
                    loadedApiUrl = null; // Treat it as unset to fall back to the new default
                }

                const finalApiUrl = loadedApiUrl || DEFAULT_API_URL;
                const finalApiKey = settings.apiKey || "";
                
                const savedModels = settings.modelList || [];
                const finalModelList = [...new Set([...DEFAULT_MODELS, ...savedModels])];
                const finalApiModel = (settings.apiModel && finalModelList.includes(settings.apiModel))
                    ? settings.apiModel
                    : DEFAULT_MODELS[0];

                app.ui.settings.setSettingValue(`${SETTING_PREFIX}ApiUrl`, finalApiUrl);
                app.ui.settings.setSettingValue(`${SETTING_PREFIX}ApiKey`, finalApiKey);
                renderModelUI(finalModelList, finalApiModel);

                // If loaded settings were incomplete or the URL was migrated, resave.
                if (!settings.apiUrl || settings.apiUrl === OLD_DEFAULT_API_URL || !settings.modelList || savedModels.length !== finalModelList.length) {
                    saveAllSettings();
                }
            } catch (e) { console.error("[云岚AI] 加载设置时发生异常:", e); }
        })();
    }
};

app.registerExtension(extension);

app.registerExtension({
    name: "yunlanfy.Components",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // 仅对云岚AI节点进行操作
        if (nodeData.category !== "云岚AI" && !nodeData.name?.startsWith("云岚_")) {
            return;
        }

        // --- 如果节点需要，则定义添加提示词管理按钮的功能 ---
        if (nodeData.input?.hidden?.prompt_id === "PROMPT_DIALOG") {
            
            nodeType.prototype.addPromptManagerButton = function() {
                // 如果按钮已添加或DOM元素未就绪，则中止
                if (this.promptButtonAdded || !this.domElement) {
                    return;
                }

                // 找到“提示词”小部件及其对应的HTML元素
                const promptWidget = this.widgets.find(w => w.name === "提示词");
                if (!promptWidget || !promptWidget.inputEl) {
                    return;
                }
                
                const widgetElement = promptWidget.inputEl.closest('.widget');
                if (!widgetElement) {
                    return;
                }

                // 防止重复添加
                if (widgetElement.parentNode.querySelector('.yunlan-prompt-button-container')) {
                    this.promptButtonAdded = true;
                    return;
                }

                // 创建按钮并设置样式和事件
                const buttonContainer = document.createElement("div");
                buttonContainer.className = "yunlan-prompt-button-container";
                buttonContainer.style.cssText = `
                    width: calc(100% - 20px);
                    padding: 0 10px;
                    box-sizing: border-box;
                    margin: 10px 10px 5px 10px;
                    position: relative;
                `;
                
                const manageButton = document.createElement("button");
                manageButton.textContent = "管理提示词";
                manageButton.className = "yunlan-prompt-button";
                manageButton.style.cssText = `
                    background: linear-gradient(90deg, #4F7CAC 0%, #2D5F8B 100%);
                    color: white;
                    border: 1px solid #4F7CAC;
                    border-radius: 4px;
                    padding: 6px 10px;
                    font-size: 12px;
                    cursor: pointer;
                    width: 100%;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    font-weight: bold;
                    transition: all 0.2s ease;
                `;
                
                manageButton.addEventListener("mousedown", (e) => e.stopPropagation());
                manageButton.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    createPromptDialog(this, promptWidget);
                });
                
                buttonContainer.appendChild(manageButton);
                
                // 将按钮插入到“提示词”小部件之后
                widgetElement.parentNode.insertBefore(buttonContainer, widgetElement.nextSibling);
                
                this.promptButtonAdded = true;
                this.setDirtyCanvas(true, true); // 强制重绘画布以显示按钮
            };
        }

        // --- 统一处理所有云岚节点的创建事件 ---
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            onNodeCreated?.apply(this, arguments);

            // 1. 为云岚AI节点应用自定义样式
            setTimeout(() => {
                if (this.domElement) {
                    this.domElement.classList.add("yunlanfy-node");
                    const titleElement = this.domElement.querySelector(".title");
                    if (titleElement) {
                        titleElement.style.background = "linear-gradient(90deg, #4F7CAC 0%, #2D5F8B 100%)";
                        titleElement.style.textShadow = "1px 1px 2px rgba(0,0,0,0.5)";
                    }
                }
            }, 10);

            // 2. 如果需要，使用轮询来安全地添加按钮，避免冲突
            if (nodeData.input?.hidden?.prompt_id === "PROMPT_DIALOG") {
                const self = this;
                let attempts = 0;
                const maxAttempts = 50; // 轮询最多10秒

                const intervalId = setInterval(() => {
                    attempts++;
                    if (self.promptButtonAdded || attempts > maxAttempts) {
                        clearInterval(intervalId);
                        return;
                    }
                    if (!self.graph) { // 如果节点已被删除
                        clearInterval(intervalId);
                        return;
                    }
                    try {
                        self.addPromptManagerButton();
                    } catch (e) {
                        console.error("[云岚AI] 添加提示词按钮时出错:", e);
                        clearInterval(intervalId); // 出错时停止
                    }
                }, 200);

                const onRemoved = self.onRemoved;
                self.onRemoved = function() {
                    clearInterval(intervalId);
                    onRemoved?.apply(this, arguments);
                };
            }
        };
    }
});

// 添加样式
document.addEventListener("DOMContentLoaded", function() {
    const style = document.createElement("style");
    style.innerHTML = `
        /* 云岚AI节点样式 */
        .yunlanfy-node {
            border: 2px solid #4F7CAC !important;
            box-shadow: 0 0 5px rgba(79, 124, 172, 0.5);
            border-radius: 6px !important;
        }
        
        .yunlanfy-node .output-slot {
            background-color: #4F7CAC !important;
        }
        
        .yunlanfy-node .input-slot {
            background-color: #2D5F8B !important;
        }
        
        .comfy-menu-entry[data-node-type^='云岚'] {
            color: #4F7CAC !important;
            font-weight: bold;
        }
        
        /* 防止对话框中的事件影响画布 */
        .yunlan-prompt-dialog, .yunlan-prompt-dialog * {
            pointer-events: auto !important;
        }
        
        .yunlan-prompt-dialog input,
        .yunlan-prompt-dialog textarea,
        .yunlan-prompt-dialog button {
            pointer-events: auto !important;
        }
        
        .yunlan-prompt-overlay {
            pointer-events: auto !important;
        }
        
        /* 提示词管理按钮悬停效果 */
        .yunlan-prompt-button:hover {
            background: linear-gradient(90deg, #2D5F8B 0%, #1D4F7B 100%) !important;
            transform: translateY(1px);
            box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        /* 提示词列表项样式 */
        .yunlan-prompt-item {
            margin-bottom: 8px;
            padding: 8px;
            background-color: #444;
            border-radius: 4px;
            border-left: 3px solid #4F7CAC;
        }
        
        /* 确保提示词管理按钮容器在节点内部显示 */
        .yunlan-prompt-button-container {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
    `;
    document.head.appendChild(style);
});

console.log("[云岚AI] yunlanfy.js 文件加载完毕");