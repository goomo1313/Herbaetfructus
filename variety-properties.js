/* Herba et Fructus – voliteľné, samostatné údaje odrôd.
 * Nikdy neodvodzujeme rast ani chuť z pôvodného poľa "type": je to zmiešaná pomologická kategória.
 * Uloženie v item.properties nemení názov, cenu, počet semien, sklad, foto ani galériu.
 */
(() => {
    'use strict';
    const fields = Object.freeze([
        { key: 'growth', id: 'varGrowth', label: 'Rastový typ', placeholder: 'napr. kolíková / kríčková', max: 100 },
        { key: 'ripening', id: 'varRipening', label: 'Skorosť / dozrievanie', placeholder: 'napr. stredne skorá', max: 100 },
        { key: 'flavor', id: 'varFlavor', label: 'Chuť', placeholder: 'vlastná skúsenosť s chuťou', max: 180 },
        { key: 'usage', id: 'varUsage', label: 'Využitie plodov', placeholder: 'napr. čerstvé, na omáčky', max: 180 },
        { key: 'growing', id: 'varGrowing', label: 'Pestovanie / stanovište', placeholder: 'napr. fóliovník, voľná pôda', max: 180 },
        { key: 'origin', id: 'varOrigin', label: 'Pôvod / zdroj osiva', placeholder: 'len ak je známy', max: 180 }
    ]);
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
    const text = v => typeof v === 'string' ? v.trim() : '';
    const hasOwn = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);
    function propertiesOf(item) {
        if (!item || !item.properties || typeof item.properties !== 'object' ||
            Array.isArray(item.properties)) return {};
        return item.properties;
    }
    function field(key) { return fields.find(entry => entry.key === key) || null; }
    function visibleFacts(item) {
        const source=propertiesOf(item);
        return fields.map(f => ({key:f.key,label:f.label,value:text(source[f.key])}))
            .filter(entry=>entry.value);
    }
    function withProperty(item, key, rawValue) {
        const definition=field(key);
        if (!definition) throw new Error('Nepovolená vlastnosť odrody.');
        if (typeof rawValue !== 'string') throw new Error('Hodnota musí byť text.');
        const value=rawValue.trim().replace(/\s+/g,' ');
        if (!value || value.length > definition.max) {
            throw new Error('Zadaj vlastnosť „'+definition.label+'“ v rozsahu 1–'+definition.max+' znakov.');
        }
        const copy={...item};
        copy.properties={...propertiesOf(item),[key]:value};
        return copy;
    }
    function withEditorProperties(item, values) {
        const previous=propertiesOf(item);
        const next={...previous};
        for (const definition of fields) {
            const raw=values[definition.key];
            if (typeof raw !== 'string') throw new Error('Nesprávna hodnota: '+definition.label);
            const value=raw.trim().replace(/\s+/g,' ');
            if (value.length > definition.max) throw new Error('Príliš dlhé pole: '+definition.label);
            if (value) next[definition.key]=value;
            else delete next[definition.key];
        }
        const clone={...item};
        if (Object.keys(next).length) clone.properties=next;
        else if (hasOwn(clone,'properties')) delete clone.properties;
        return clone;
    }
    function fromEditor() {
        const values={};
        for (const f of fields) {
            const input=document.getElementById(f.id);
            if (!input) throw new Error('Chýba pole vlastnosti „'+f.label+'“.');
            values[f.key]=String(input.value ?? '');
        }
        return values;
    }
    function fillEditor(item) {
        const props=propertiesOf(item);
        for (const f of fields) {
            const input=document.getElementById(f.id);
            if (input) input.value=text(props[f.key]);
        }
    }
    function cardFacts(item) {
        const preferred=['growth','ripening','usage','flavor'];
        const found=visibleFacts(item).filter(x=>preferred.includes(x.key)).slice(0,3);
        if (!found.length) return '';
        return '<dl class="variety-facts">'+found.map(x=>
            '<div><dt>'+escapeHtml(x.label)+'</dt><dd>'+escapeHtml(x.value)+'</dd></div>'
        ).join('')+'</dl>';
    }
    function detailFacts(item) {
        return visibleFacts(item).map(x=>[x.label,x.value]);
    }
    window.HERBA_VARIETY_PROPERTIES=Object.freeze({
        fields, field, propertiesOf, visibleFacts, withProperty, withEditorProperties,
        fromEditor, fillEditor, cardFacts, detailFacts
    });
})();
