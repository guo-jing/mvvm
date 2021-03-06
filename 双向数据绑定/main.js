// Mvvm 构造函数声明，重写 data 的所有属性的 set 和 get 方法，搜索并绑定 html 中对应的数据
class Mvvm {
    constructor(obj) {
        this.subjects = {};
        this.data = obj.data;
        this.setProperty(this.data, this.subjects);
        this.searchBindData(document.querySelector(obj.element), this.data, this.subjects);
    }

    // 重写 data 的每个属性，给每个 key 创建一个 Subject 实例，并且当 data 的属性 set 时会调用 subject.notify() 方法
    setProperty(data, subjects) {
        if (!data || typeof data !== 'object') {
            return;
        }
        for (let key in data) {
            let value = data[key];
            let subject = new Subject(key);
            subjects[key] = subject;
            Object.defineProperty(data, key, {
                configurable: true,
                enumerable: true,
                get: function () {
                    console.log(`get value ${value}`);
                    return value;
                },
                set: function (setValue) {
                    console.log(`value change from ${value} to ${setValue}`);
                    value = setValue;
                    subject.notify(setValue);
                }
            });
            typeof value === 'object' && this.setProperty(value, subjects);
        }
    }

    // 1.查找参数 node 中的所有包含 {{xxx}} 格式的子节点，将子节点中的 {{xxx}} 替换成参数 data 中对应的值后，赋值回子节点
    // 2.对于所有包含 {{xxx}} 格式的子节点，为其创建一个 Observer 实例，并且根据实例的 template 中绑定的数据来订阅对应的主题
    // 3.对于 node 中不是 text 类型的子节点，继续执行 searchBindData() 方法
    // 4.处理 v-model 指令
    searchBindData(node, data, subjects) {
        let reg = /{{[a-zA-Z$_][a-zA-Z\d_]*}}/g;
        let childNodes = node.childNodes;
        childNodes.forEach(node => {
            // 子节点类型是文本
            if (node.nodeType === 3) {
                let matches = node.data.match(reg);
                if (matches !== null) {
                    let words = node.data.split(/{{|}}/g);
                    let replacementResult = words[0];
                    let observer = new Observer(node, node.data, 'updateText');
                    matches.forEach((item, index) => {
                        let key = item.replace(/{{|}}/g, '');
                        observer.subscribe(subjects[key]);
                        observer.data[key] = data[key];
                        replacementResult = replacementResult + data[key] + words[2 + index * 2];
                    });
                    node.data = replacementResult;
                }
            }
            // 子节点类型是节点
            if (node.nodeType === 1) {
                let attrArray = [...node.attributes];
                attrArray.forEach(attr => {
                    // 如果属性名是指令，并且属性值是 data 的一个 key
                    if (Mvvm.isDirective(attr.name) && Object.keys(data).includes(attr.value)) {
                        let observer = new Observer(node, node.data, 'updateVModel');
                        observer.subscribe(subjects[attr.value]);
                        observer.update(node, this.data[attr.value]);
                        let methodName = attr.name;
                        let index = 0;
                        methodName = 'bind' + methodName.replace(/^(\w)|-([a-z])/g,
                            (match, ...p) => p[index++].toUpperCase());
                        this[methodName](node, attr.value);
                    }
                });
                this.searchBindData(node, data, subjects);
            }
        });
    }

    // 判断是不是指令，目前只有 v-model
    static isDirective(str) {
        return ['v-model'].includes(str);
    }

    // 监听 v-model 改变
    bindVModel(node, key) {
        node.addEventListener('input', () => {
            this.data[key] = node.value;
        });
    }

}

// 把 Mvvm.data 中每个属性都作为一个 Subject 实例
class Subject {

    // key 是 Mvvm.data 中每个属性的属性名，observers 数组中存储当 Subject 发生改变时需要通知的所有 Observer
    constructor(key) {
        this.key = key;
        this.observers = [];
    }

    // 添加 Observer
    addObserver(observer) {
        this.observers.push(observer);
    }

    // 当 Mvvm.data[this.key] 发生改变时，通知所有 observers 更新数据
    notify(setValue) {
        this.observers.forEach(item => {
            item.update(this.key, setValue);
        });
    }
}

// 把每个包含 {{[a-zA-Z$_][a-zA-Z\d_]*}} 的 HTML 节点都作为一个 Observer 实例
class Observer {

    // node：节点的 DOM，template：节点的原始内容，data：节点中所有的绑定数据
    constructor(node, template, funcName) {
        this.node = node;
        this.template = template;
        this.data = {};
        this.updateFunction = funcName;
    }

    // 订阅一个主题，当主题改变时主题会调用下面的 update 方法来更新节点
    subscribe(subject) {
        subject.addObserver(this);
    }

    // 当主题改变时执行更新
    update(key, value) {
        this[this.updateFunction](key, value);
    }

    // 更新当前实例的 data，然后替换 this.template 中的所有 {{xxx}} 并赋值给 this.node.data
    updateText(key, value) {
        let reg = /{{[a-zA-Z$_][a-zA-Z\d_]*}}/g;
        this.data[key] = value;
        let words = this.template.split(/{{|}}/g);
        let replacementResult = words[0];
        let matches = this.template.match(reg);
        matches.forEach((item, index) => {
            let key = item.replace(/{{|}}/g, '');
            replacementResult = replacementResult + this.data[key] + words[2 + index * 2];
            this.node.data = replacementResult;
        });
    }

    // 更新 input 元素
    updateVModel(key, value) {
        this.node.value = value;
    }
}

// 以上是 MVVM 框架
// 以下是测试代码

let model = new Mvvm({
    element: '#app',
    data: {
        name1: '杰诺斯',
        name2: '音速索尼克',
        name3: '深海王'
    }
});

let resetButton1 = document.querySelector('.reset1');
resetButton1.addEventListener('click', () => model.data.name1 = '杰诺斯');
let resetButton2 = document.querySelector('.reset2');
resetButton2.addEventListener('click', () => model.data.name2 = '音速索尼克');
let resetButton3 = document.querySelector('.reset3');
resetButton3.addEventListener('click', () => model.data.name3 = '深海王');

