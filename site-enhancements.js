/* Herba et Fructus – nástroje pre katalóg a správcu, len lokálny pohľad na dáta Supabase. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const byName = name => varietyDatabase.find(v => v && v.name === name);
    const format = value => String(value == null ? '' : value);
    const escape = value => format(value).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    const compareNames = [];
    const previousSort = new Map();
    const previousGrid = new Map();
    const collator = new Intl.Collator('sk', { sensitivity:'base', numeric:true });
    let focusBeforeOverlay = null;

    function number(value) {
        const n = Number.parseFloat(format(value).replace(',', '.').replace('€',''));
        return Number.isFinite(n) ? n : NaN;
    }
    function grams(weight) {
        const raw = format(weight).trim().toLowerCase().replace(/,/g, '.');
        const found = raw.match(/\d+(?:\.\d+)?/g);
        if (!found || !found.length) return NaN;
        const values = found.slice(0, 2).map(Number);
        let midpoint = values.length === 2 ? (values[0] + values[1]) / 2 : values[0];
        if (/\bkg\b/.test(raw)) midpoint *= 1000;
        return midpoint;
    }
    function validPhoto(item) {
        const arr = [item?.img].concat(Array.isArray(item?.gallery) ? item.gallery : []);
        return arr.some(url => typeof url === 'string' && /^https:\/\//i.test(url.trim()));
    }
    function hasMissingFields(item) {
        return !item || !format(item.name).trim() || !format(item.section).trim()
            || !format(item.type).trim() || !format(item.color).trim()
            || !format(item.weight).trim() || !format(item.info).trim()
            || !format(item.seedsPerPack).trim()
            || !(number(item.price) > 0);
    }
    function diagnostics(items) {
        const list = Array.isArray(items) ? items : [];
        return {
            total:list.length,
            visible:list.filter(x => !x.hidden).length,
            hidden:list.filter(x => !!x.hidden).length,
            noPhoto:list.filter(x => !validPhoto(x)).length,
            incomplete:list.filter(hasMissingFields).length,
            soldOut:list.filter(x => !x.hidden && !(Number(x.stock) > 0)).length,
            stock:list.reduce((sum,x) => sum + Math.max(0, Number(x.stock) || 0),0)
        };
    }
    function makeButton(text, onClick, className) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        if (className) button.className = className;
        button.addEventListener('click', onClick);
        return button;
    }
    function showModal(id) {
        const modal = $(id);
        if (!modal) return false;
        focusBeforeOverlay = document.activeElement;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden','false');
        const first = modal.querySelector('.enhanced-close');
        if (first) first.focus();
        return true;
    }
    function closeModal(id) {
        const modal = $(id);
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden','true');
        }
        if (focusBeforeOverlay && typeof focusBeforeOverlay.focus === 'function') focusBeforeOverlay.focus();
        focusBeforeOverlay = null;
    }
    function dashboardOpen() {
        if (typeof requireAdmin !== 'function' || !requireAdmin()) return false;
        dashboardRender();
        return showModal('enhancedDashboardOverlay');
    }
    function dashboardClose() { closeModal('enhancedDashboardOverlay'); }
    function statBox(title, value) {
        const el = document.createElement('div');
        el.className = 'enhanced-stat';
        const strong = document.createElement('strong');
        strong.textContent = String(value);
        const label = document.createElement('span');
        label.textContent = title;
        el.append(strong,label);
        return el;
    }
    function dashAction(label, cb) {
        return makeButton(label, cb);
    }
    function dashboardRender() {
        const stats = $('enhancedDashboardStats');
        const actions = $('enhancedDashboardActions');
        if (!stats || !actions) return;
        const d = diagnostics(varietyDatabase);
        stats.replaceChildren();
        [
            ['Odrody spolu',d.total],['Zobrazené',d.visible],['Skryté',d.hidden],
            ['Bez fotky',d.noPhoto],['Neúplné údaje',d.incomplete],
            ['Vypredané',d.soldOut],['Balenia na sklade',d.stock]
        ].forEach(([label,value]) => stats.appendChild(statBox(label,value)));
        actions.replaceChildren();
        const go = (callback) => {
            dashboardClose();
            callback();
        };
        actions.appendChild(dashAction('📋 Správa skladu',()=>go(openTableManagerModal)));
        actions.appendChild(dashAction('🌱 Pridať odrodu',()=>go(openVarietyModal)));
        actions.appendChild(dashAction('📦 Zálohovať JSON',()=>exportJsonData()));
        actions.appendChild(dashAction('☁️ Overiť cloud',()=>downloadSiteCode()));
        actions.appendChild(dashAction('📂 Správa kariet',()=>go(openSectionTableModal)));
        actions.appendChild(dashAction('📝 Pridať článok',()=>go(openBlogModal)));
        const paused = typeof isOrderFormPaused === 'function' && isOrderFormPaused();
        actions.appendChild(dashAction(paused ? '▶ Obnoviť formulár' : '⏸ Pozastaviť formulár',async() => {
            if (typeof toggleOrderFormPaused === 'function') {
                await toggleOrderFormPaused();
                dashboardRender();
            }
        }));
        const hint = $('enhancedDashboardHint');
        if (hint) hint.textContent = 'Diagnostika aktuálne načítaného katalógu. Neúplné údaje sú len upozornenie a neprepisujú sa automaticky. Objednávky sa neevidujú v tejto databáze.';
        dashboardFilter();
    }
    function statusMatches(item, status) {
        if (status === 'missing-photo') return !validPhoto(item);
        if (status === 'incomplete') return hasMissingFields(item);
        if (status === 'out') return !item.hidden && !(Number(item.stock) > 0);
        if (status === 'hidden') return !!item.hidden;
        return true;
    }
    function dashboardFilter() {
        const tbody = $('enhancedDashboardRows');
        const search = format($('enhancedDashboardSearch')?.value).trim().toLocaleLowerCase('sk');
        const status = $('enhancedDashboardStatus')?.value || 'all';
        if (!tbody) return;
        tbody.replaceChildren();
        let matches = 0;
        varietyDatabase.forEach((item, index) => {
            const combined = [item.name,item.type,item.section,item.color,item.weight,item.info]
                .map(x => format(x).toLocaleLowerCase('sk')).join(' ');
            if (!combined.includes(search) || !statusMatches(item,status)) return;
            matches++;
            const tr = document.createElement('tr');
            const add = value => {
                const td=document.createElement('td');
                td.textContent=format(value);
                tr.appendChild(td);
                return td;
            };
            add(item.name);
            add(item.section);
            const photo=add(validPhoto(item) ? '✓ Áno' : '— Chýba');
            if (!validPhoto(item)) photo.className='enhanced-alert-cell';
            add(Number(item.stock) > 0 ? String(item.stock) + ' bal.' : 'Vypredané');
            add(hasMissingFields(item) ? 'Doplniť údaje' : 'Úplné');
            const action=document.createElement('td');
            action.appendChild(makeButton('✏️ Upraviť',()=> {
                dashboardClose();
                editVariety(index);
            }));
            tr.appendChild(action);
            tbody.appendChild(tr);
        });
        const result = $('enhancedDashboardCount');
        if (result) result.textContent = 'Zobrazených ' + matches + ' z ' + varietyDatabase.length + ' odrôd';
        const empty = $('enhancedDashboardEmpty');
        if (empty) empty.hidden = matches > 0;
    }
    function colorMatches(raw, selected) {
        if(selected==='all') return true;
        const color=format(raw).toLocaleLowerCase('sk');
        if(selected==='žltá') return color.includes('žlt') || color.includes('oranž');
        if(selected==='čierna') return color.includes('čier') || color.includes('tmav') || color.includes('fialov');
        if(selected==='pásikavá') return ['pásik','pestr','pruh','bicolor','dvojfareb'].some(v=>color.includes(v));
        return color.includes(selected);
    }
    function weightMatches(value, band) {
        if (!band || band === 'all') return true;
        const w = grams(value);
        if (!Number.isFinite(w)) return false;
        if (band === 'small') return w <= 30;
        if (band === 'medium') return w > 30 && w <= 100;
        if (band === 'large') return w > 100 && w <= 250;
        if (band === 'giant') return w > 250;
        return true;
    }
    function sortKey(card, order) {
        if (order === 'price-asc' || order === 'price-desc') {
            const price = Number(card.dataset.price);
            return Number.isFinite(price) ? price : Infinity;
        }
        if (order === 'weight-asc' || order === 'weight-desc') {
            const weight = Number(card.dataset.weight);
            return Number.isFinite(weight) ? weight : Infinity;
        }
        return card.dataset.name || '';
    }
    function applyFilters(sectionId) {
        const grid=document.querySelector('[data-section-grid="' + sectionId + '"]');
        if (!grid) return;
        const cards=[...grid.querySelectorAll('.variety-card')];
        const query=format($('searchInput_' + sectionId)?.value).trim().toLocaleLowerCase('sk');
        const availability=$('filterAvailability_' + sectionId)?.value || 'all';
        const weight=$('filterWeight_' + sectionId)?.value || 'all';
        const sort=$('filterSort_' + sectionId)?.value || 'default';
        const category=(typeof currentCategory==='string' ? currentCategory:'all');
        const color=(typeof currentColor==='string' ? currentColor:'all');
        let shown=0;
        for(const card of cards) {
            const stock=Number(card.dataset.stock)||0;
            const matchText=format(card.dataset.search).includes(query);
            const matchType=category==='all' || card.dataset.type===category;
            const matchColor=colorMatches(card.dataset.color,color);
            const matchWeight=weightMatches(card.dataset.weightText,weight);
            const matchAvailability=availability==='all'
                || (availability==='stock' && stock>0 && card.dataset.hidden!=='true')
                || (availability==='out' && stock<=0)
                || (availability==='photos' && card.dataset.hasPhoto==='true');
            const match=matchText && matchType && matchColor && matchWeight && matchAvailability;
            card.style.display=match?'flex':'none';
            if(match) shown++;
        }
        // A newly rendered category has fresh cards even when the sort choice is unchanged.
        // Invalidate only that category's sort cache when its grid element is replaced.
        if (previousGrid.get(sectionId) !== grid) {
            previousSort.delete(sectionId);
            previousGrid.set(sectionId, grid);
        }
        // Sorting may move tens/hundreds of DOM nodes. Only do it if the selected
        // ordering changes; text search and stock filters should change visibility only.
        if(previousSort.get(sectionId)!==sort) {
            if(sort!=='default') {
                cards.sort((a,b)=>{
                    if(sort==='name') return collator.compare(a.dataset.name||'',b.dataset.name||'');
                    const desc=sort.endsWith('desc');
                    const ka=sortKey(a,sort),kb=sortKey(b,sort);
                    if(typeof ka==='number' && typeof kb==='number') {
                        if(!Number.isFinite(ka))return 1;
                        if(!Number.isFinite(kb))return -1;
                        return desc ? kb-ka : ka-kb;
                    }
                    return collator.compare(format(ka),format(kb));
                });
            } else {
                cards.sort((a,b)=>Number(a.dataset.originalOrder)-Number(b.dataset.originalOrder));
            }
            for(const card of cards) grid.appendChild(card);
            previousSort.set(sectionId,sort);
        }
        const counter=$('filterCount_' + sectionId);
        if(counter) counter.textContent='Zobrazených ' + shown + ' z ' + cards.length + ' odrôd';
    }
    function bindCompareCard(card, item) {
        const button=card.querySelector('.enhanced-compare-btn');
        if(!button) return;
        const selected=compareNames.includes(item.name);
        button.setAttribute('aria-pressed',String(selected));
        button.textContent=selected ? '✓ Vo výbere na porovnanie' : '⚖️ Porovnať odrodu';
        button.addEventListener('click',()=>toggleCompare(item.name));
    }
    function renderTray() {
        const tray=$('enhancedCompareTray');
        const count=$('enhancedCompareCount');
        const button=$('enhancedCompareOpen');
        if (!tray) return;
        const valid=compareNames.filter(name=>byName(name) && !byName(name).hidden);
        compareNames.splice(0,compareNames.length,...valid);
        tray.classList.toggle('active',compareNames.length>0);
        tray.setAttribute('aria-hidden',String(compareNames.length===0));
        if(count) count.textContent='Porovnanie: '+compareNames.length+'/3';
        if(button) button.disabled=compareNames.length<2;
        document.querySelectorAll('.enhanced-compare-btn').forEach(btn=>{
            const name=btn.dataset.name;
            const chosen=compareNames.includes(name);
            btn.setAttribute('aria-pressed',String(chosen));
            btn.textContent=chosen?'✓ Vo výbere na porovnanie':'⚖️ Porovnať odrodu';
        });
    }
    function toggleCompare(name) {
        const item=byName(name);
        if(!item || item.hidden) return false;
        const index=compareNames.indexOf(name);
        if(index>=0) compareNames.splice(index,1);
        else if(compareNames.length<3) compareNames.push(name);
        else {
            if(typeof showToast==='function') showToast('Na porovnanie možno vybrať najviac 3 odrody.');
            return false;
        }
        renderTray();
        return true;
    }
    function resetCompare() {
        compareNames.splice(0,compareNames.length);
        renderTray();
        compareClose();
    }
    function compareOpen() {
        if(compareNames.length<2) return false;
        const host=$('enhancedCompareItems');
        if(!host)return false;
        host.replaceChildren();
        compareNames.forEach(name=>{
            const item=byName(name);
            if(!item)return;
            const box=document.createElement('article');
            box.className='enhanced-compare-item';
            const media=document.createElement('div');
            media.className='enhanced-compare-image';
            if(validPhoto(item)) {
                const url=[item.img,...(Array.isArray(item.gallery)?item.gallery:[])]
                    .find(u=>typeof u==='string' && /^https:\/\//i.test(u));
                const image=document.createElement('img');
                image.src=url;
                image.alt='Fotografia odrody '+item.name;
                image.loading='lazy';
                image.decoding='async';
                media.appendChild(image);
            } else media.textContent='🌱 Bez fotografie';
            box.appendChild(media);
            const h=document.createElement('h3');
            h.textContent=item.name;
            box.appendChild(h);
            const list=document.createElement('dl');
            [
                ['Farba',item.color],['Typ',item.type],['Hmotnosť',item.weight],
                ['Cena/balenie',item.price ? String(item.price)+' €':'Neuvedená'],
                ['Semená/balenie',item.seedsPerPack],
                ['Dostupnosť',Number(item.stock)>0 ? String(item.stock)+' bal.':'Vypredané']
            ].forEach(([key,value])=>{
                const dt=document.createElement('dt'),dd=document.createElement('dd');
                dt.textContent=key;
                dd.textContent=format(value).trim()||'Nezadané';
                list.append(dt,dd);
            });
            box.appendChild(list);
            const description=document.createElement('p');
            description.textContent=format(item.info)||'Opis zatiaľ nie je doplnený.';
            box.appendChild(description);
            box.appendChild(makeButton('Detail odrody',()=>{
                compareClose();
                if(window.HERBA_CATALOGUE)window.HERBA_CATALOGUE.open(name);
            }));
            host.appendChild(box);
        });
        return showModal('enhancedCompareOverlay');
    }
    function compareClose() { closeModal('enhancedCompareOverlay'); }
    function setup() {
        const dashboard=$('enhancedDashboardOverlay');
        const comparison=$('enhancedCompareOverlay');
        [dashboard,comparison].forEach((overlay)=>{
            if(overlay)overlay.addEventListener('click',event=>{
                if(event.target===overlay) closeModal(overlay.id);
            });
        });
        const dashboardCloseButton=$('enhancedDashboardClose');
        if(dashboardCloseButton)dashboardCloseButton.addEventListener('click',dashboardClose);
        const compareCloseButton=$('enhancedCompareClose');
        if(compareCloseButton)compareCloseButton.addEventListener('click',compareClose);
        const dashboardSearch=$('enhancedDashboardSearch');
        if(dashboardSearch)dashboardSearch.addEventListener('input',dashboardFilter);
        const dashboardStatus=$('enhancedDashboardStatus');
        if(dashboardStatus)dashboardStatus.addEventListener('change',dashboardFilter);
        const compareOpenButton=$('enhancedCompareOpen');
        if(compareOpenButton)compareOpenButton.addEventListener('click',compareOpen);
        const clearButton=$('enhancedCompareReset');
        if(clearButton)clearButton.addEventListener('click',resetCompare);
        document.addEventListener('keydown', event=>{
            if(event.key!=='Escape')return;
            if(dashboard?.classList.contains('active'))dashboardClose();
            if(comparison?.classList.contains('active'))compareClose();
        });
    }
    window.HERBA_IMPROVEMENTS = {
        dashboardOpen,dashboardClose,dashboardRender,dashboardFilter,diagnostics,
        validPhoto,hasMissingFields,grams,weightMatches,colorMatches,applyFilters,
        bindCompareCard,toggleCompare,renderTray,compareOpen,compareClose,resetCompare,
        selected:()=>compareNames.slice()
    };
    setup();
})();
