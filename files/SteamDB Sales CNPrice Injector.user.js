// ==UserScript==
// @name         SteamDB Sales CNPrice Injector
// @namespace    https://liangying.eu.org/
// @version      0.5
// @description  Adds CNPrice column to SteamDB sales page with selectable currency conversions.
// @author       LiangYing
// @match        https://steamdb.info/sales/*
// @grant        GM_xmlhttpRequest
// @connect      store.steampowered.com
// @icon         https://store.steampowered.com/favicon.ico
// @license      MIT
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 汇率对象
    const exchangeRates = {
        CNY: 1,
        JPY: 20.5,
        HKD: 1.09,
        USD: 0.14,
        RUB: 12.7,
        PHP: 7.74,
        INR: 11.52,
        KRW: 185.87,
        CAD: 0.19
    };
    let currentRate = exchangeRates.CNY; // 设定默认汇率

    // 解析价格文本中的数字
    function parsePrice(priceText) {
        return parseFloat(priceText.replace(/[^0-9.]/g, ''));
    }

    // 添加CNPrice列头
    const header = document.querySelector('.table-sales thead tr');
    const cnPriceHeader = document.createElement('th');
    cnPriceHeader.innerHTML = 'CNPrice';
    header.appendChild(cnPriceHeader);

    // 为每行数据添加CNPrice列
    const rows = document.querySelectorAll('.table-sales tbody tr');
    rows.forEach(row => {
        const cnPriceCell = document.createElement('td');
        cnPriceCell.className = 'cn-price';
        row.appendChild(cnPriceCell);
    });

    // 获取并显示国区价格，并转换为所选货币后比较
    function fetchAndDisplayCNPrice(appid, cell, rate) {
        const url = `https://store.steampowered.com/api/appdetails/?appids=${appid}&cc=cn`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    const priceInfo = data[appid].data.price_overview;
                    if (priceInfo) {
                        const cnPrice = priceInfo.final / 100; // 价格以分为单位，转换为元
                        const convertedPrice = cnPrice * rate; // 使用所选汇率转换价格
                        const comparisonPriceCell = cell.parentElement.children[4];
                        const comparisonPrice = parsePrice(comparisonPriceCell.textContent);
                        const percentage = (comparisonPrice * 100 / convertedPrice).toFixed(2); // 比例计算
                        cell.textContent = `${convertedPrice.toFixed(2)} (${percentage}%)`; // 显示转换后的价格和百分比

                        // 比较价格并设置颜色
                        if (convertedPrice > comparisonPrice) {
                            cell.style.color = 'green';
                        } else {
                            cell.style.color = 'red';
                        }
                    } else {
                        cell.textContent = 'N/A';
                    }
                } catch (error) {
                    console.error('Error fetching CN price:', error);
                    cell.textContent = 'Error';
                }
            },
            onerror: function(error) {
                console.error('Error fetching CN price:', error);
                cell.textContent = 'Error';
            }
        });
    }

    // 创建汇率选择框并添加到页面
    const controlsContainer = document.querySelector('.dataTable_display');
    const rateSelect = document.createElement('select');
    rateSelect.innerHTML = `
        <option value="CNY">LiangYing Exchange</option>
        <option value="JPY">JPY (日本)</option>
        <option value="HKD">HKD (香港)</option>
        <option value="USD">USD (美国*)</option>
        <option value="RUB">RUB (俄罗斯)</option>
        <option value="PHP">PHP (菲律宾)</option>
        <option value="INR">INR (印度)</option>
        <option value="KRW">KRW (韩国)</option>
        <option value="CAD">CAD (加拿大)</option>
`;
    controlsContainer.appendChild(rateSelect); // 添加选择框到页面

    // 汇率选择框的事件监听器
    rateSelect.addEventListener('change', function() {
        currentRate = exchangeRates[this.value];
        refreshPrices(); // 用户选择了不同的汇率，立即刷新价格
    });

    // 刷新价格的函数, 以适应表格更新和新增行
    function refreshPrices() {
        if(currentRate == 1) {
        return;
        }
        // 获取全部当前存在的行，包括新添加的行
        const rows = document.querySelectorAll('.table-sales tbody tr');

        rows.forEach(row => {
            const appid = row.dataset.appid;
            let cnPriceCell = row.querySelector('.cn-price');

            // 如果当前行没有CNPrice列，就创建一个
            if (!cnPriceCell) {
                cnPriceCell = document.createElement('td');
                cnPriceCell.className = 'cn-price';
                row.appendChild(cnPriceCell);
            }

            // 清除原有的价格信息
            cnPriceCell.textContent = '';

            // 为每个行重新获取和显示价格信息
            if (appid) {
                fetchAndDisplayCNPrice(appid, cnPriceCell, currentRate);
            }
        });
    }

    // 创建一个变量来存储上一次分页控件的数据快照
    let lastPaginationSnapshot = '';

    // 创建一个函数来检查分页控件是否更新
    function checkForPaginationUpdates() {
        // 尝试获取分页控件，如果没有找到，则不进行任何操作
        const paginationControl = document.querySelector('.app'); // 假定分页控件的类名为.app
        if (!paginationControl) return;

        // 将当前的分页控件数据转换为字符串
        const currentPaginationSnapshot = paginationControl.innerText; // 使用innerText获取可见文本
        // 比较上一次的快照和当前快照
        if(lastPaginationSnapshot !== currentPaginationSnapshot) {
            // 如果分页控件有更新，刷新价格
            refreshPrices();
            // 更新最后一次的分页控件快照
            lastPaginationSnapshot = currentPaginationSnapshot;
        }
    }

    // 页面加载完毕后立即执行一次分页控件快照，并定时执行更新检查
    window.addEventListener('load', () => {
        const paginationControl = document.querySelector('.app');
        if (paginationControl) lastPaginationSnapshot = paginationControl.innerText;
        setInterval(checkForPaginationUpdates, 1000); // 1秒检查一次
    });

})();