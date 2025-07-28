/**
 * ComfyUI-YunlanFy - Improved Prompt Management System
 * 
 * Features:
 * - Prompt categorization (using prefix:name format)
 * - Favorites system
 * - Recently used prompts tracking
 * - Better organization and UI
 */

// 使用ComfyUI的模块系统
(function() {
// 避免使用import语句，改用ComfyUI的全局变量
const app = window.app;

class PromptManager {
    constructor() {
        this.prompts = {};
        this.favorites = [];
        this.recentlyUsed = [];
        this.categories = [];
        this.maxRecents = 10;
        this.initialized = false;
    }

    /**
     * Initialize the prompt manager
     */
    async init() {
        if (this.initialized) return;
        
        await this.loadPrompts();
        await this.loadUserPreferences();
        this.updateCategories();
        this.initialized = true;
        
        console.log("[云岚AI] 提示词管理系统初始化完成");
    }

    /**
     * Load prompts from the server
     */
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
    }

    /**
     * Save prompts to the server
     */
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
    }

    /**
     * Load user preferences (favorites, recently used)
     */
    async loadUserPreferences() {
        try {
            const savedPrefs = localStorage.getItem('yunlanfy_prompt_preferences');
            if (savedPrefs) {
                const prefs = JSON.parse(savedPrefs);
                this.favorites = prefs.favorites || [];
                this.recentlyUsed = prefs.recentlyUsed || [];
                // Clean up any non-existent prompts
                this.favorites = this.favorites.filter(name => this.prompts.hasOwnProperty(name));
                this.recentlyUsed = this.recentlyUsed.filter(name => this.prompts.hasOwnProperty(name));
            }
        } catch (e) {
            console.error("[云岚AI] 加载提示词偏好设置失败:", e);
            this.favorites = [];
            this.recentlyUsed = [];
        }
    }

    /**
     * Save user preferences (favorites, recently used)
     */
    async saveUserPreferences() {
        try {
            const prefs = {
                favorites: this.favorites,
                recentlyUsed: this.recentlyUsed
            };
            localStorage.setItem('yunlanfy_prompt_preferences', JSON.stringify(prefs));
        } catch (e) {
            console.error("[云岚AI] 保存提示词偏好设置失败:", e);
        }
    }

    /**
     * Update categories based on current prompts
     */
    updateCategories() {
        const categorySet = new Set();
        
        // Add "All" as the first category
        categorySet.add("全部");
        
        // Add "Favorites" category if there are any favorites
        if (this.favorites.length > 0) {
            categorySet.add("收藏夹");
        }
        
        // Add "Recent" category if there are any recent prompts
        if (this.recentlyUsed.length > 0) {
            categorySet.add("最近使用");
        }
        
        // Extract categories from prompt names (format: "category:name")
        for (const promptName of Object.keys(this.prompts)) {
            if (promptName.includes(':')) {
                const category = promptName.split(':')[0].trim();
                categorySet.add(category);
            } else {
                categorySet.add("未分类");
            }
        }
        
        this.categories = Array.from(categorySet);
    }

    /**
     * Get all prompt names
     */
    getAllPromptNames() {
        return Object.keys(this.prompts);
    }

    /**
     * Get prompts filtered by category
     * @param {string} category - Category name or special category (favorites, recent)
     */
    getPromptsByCategory(category) {
        if (!category || category === "全部") {
            return this.getAllPromptNames();
        }
        
        if (category === "收藏夹") {
            return this.favorites;
        }
        
        if (category === "最近使用") {
            return this.recentlyUsed;
        }
        
        if (category === "未分类") {
            return this.getAllPromptNames().filter(name => !name.includes(':'));
        }
        
        return this.getAllPromptNames().filter(name => {
            return name.startsWith(category + ':');
        });
    }

    /**
     * Get display name for a prompt (removes category prefix)
     * @param {string} fullName - Full prompt name with category
     */
    getDisplayName(fullName) {
        if (fullName.includes(':')) {
            return fullName.split(':')[1].trim();
        }
        return fullName;
    }

    /**
     * Add a new prompt
     * @param {string} name - Prompt name (can include category prefix)
     * @param {string} content - Prompt content
     */
    async addPrompt(name, content) {
        if (!name || !content) return false;
        
        await this.loadPrompts();
        this.prompts[name] = content;
        
        const success = await this.savePrompts();
        if (success) {
            this.updateCategories();
        }
        
        return success;
    }

    /**
     * Delete a prompt
     * @param {string} name - Prompt name to delete
     */
    async deletePrompt(name) {
        if (!name || name === "默认提示词") return false;
        
        await this.loadPrompts();
        if (this.prompts[name]) {
            delete this.prompts[name];
            
            // Also remove from favorites and recently used if it exists there
            this.favorites = this.favorites.filter(item => item !== name);
            this.recentlyUsed = this.recentlyUsed.filter(item => item !== name);
            await this.saveUserPreferences();
            
            const success = await this.savePrompts();
            if (success) {
                this.updateCategories();
            }
            
            return success;
        }
        return false;
    }

    /**
     * Edit an existing prompt
     * @param {string} oldName - Original prompt name
     * @param {string} newName - New prompt name
     * @param {string} content - Updated content
     */
    async editPrompt(oldName, newName, content) {
        if (!oldName || !newName || !content) return false;
        if (oldName === "默认提示词" && newName !== "默认提示词") return false;
        
        await this.loadPrompts();
        if (oldName !== newName) {
            delete this.prompts[oldName];
            
            // Update in favorites and recently used if it exists there
            const favIndex = this.favorites.indexOf(oldName);
            if (favIndex !== -1) {
                this.favorites[favIndex] = newName;
            }
            
            const recentIndex = this.recentlyUsed.indexOf(oldName);
            if (recentIndex !== -1) {
                this.recentlyUsed[recentIndex] = newName;
            }
            
            await this.saveUserPreferences();
        }
        
        this.prompts[newName] = content;
        
        const success = await this.savePrompts();
        if (success) {
            this.updateCategories();
        }
        
        return success;
    }

    /**
     * Toggle favorite status for a prompt
     * @param {string} name - Prompt name
     */
    async toggleFavorite(name) {
        if (!this.prompts[name]) return false;
        
        const index = this.favorites.indexOf(name);
        if (index !== -1) {
            // Remove from favorites
            this.favorites.splice(index, 1);
        } else {
            // Add to favorites
            this.favorites.push(name);
        }
        
        await this.saveUserPreferences();
        this.updateCategories();
        
        return true;
    }

    /**
     * Check if a prompt is in favorites
     * @param {string} name - Prompt name
     */
    isFavorite(name) {
        return this.favorites.includes(name);
    }

    /**
     * Mark a prompt as recently used
     * @param {string} name - Prompt name
     */
    async markAsRecentlyUsed(name) {
        if (!this.prompts[name]) return false;
        
        // Remove if already in the list
        this.recentlyUsed = this.recentlyUsed.filter(item => item !== name);
        
        // Add to the beginning
        this.recentlyUsed.unshift(name);
        
        // Keep only the maximum number of recent items
        if (this.recentlyUsed.length > this.maxRecents) {
            this.recentlyUsed = this.recentlyUsed.slice(0, this.maxRecents);
        }
        
        await this.saveUserPreferences();
        this.updateCategories();
        
        return true;
    }

    /**
     * Create a dropdown widget with prompt options
     * @param {string} value - Current value
     * @param {function} callback - onChange callback
     */
    createDropdown(value, callback) {
        // 确保提示词已加载
        if (!this.initialized) {
            this.init();
        }
        
        // 获取当前所有提示词名称
        const promptNames = this.getAllPromptNames();
        
        // 如果当前值不在列表中，将其添加进来
        if (value && !promptNames.includes(value)) {
            promptNames.push(value);
        }
        
        // 标记当前选中的提示词为最近使用
        if (value) {
            this.markAsRecentlyUsed(value);
        }
        
        // 返回下拉列表所需的配置
        return {
            values: promptNames,
            value: value || (promptNames.length > 0 ? promptNames[0] : ""),
            callback: (v) => {
                // 当选择改变时，标记为最近使用并调用回调函数
                this.markAsRecentlyUsed(v);
                if (callback) callback(v);
            }
        };
    }
}

// 创建单例实例
const promptManager = new PromptManager();

// 初始化
document.addEventListener("DOMContentLoaded", () => {
    promptManager.init();
});

// 导出到全局作用域，以便其他脚本可以访问
window.yunlanPromptManager = promptManager;

// 结束立即执行函数
})();