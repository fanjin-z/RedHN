export function sanitizeHnHtml(html: string): string {
    const template = document.createElement('template');
    template.innerHTML = html;

    for (const element of template.content.querySelectorAll('*')) {
        if (
            [
                'script',
                'style',
                'iframe',
                'object',
                'embed',
                'link',
                'meta',
            ].includes(element.tagName.toLowerCase())
        ) {
            element.remove();
            continue;
        }

        for (const attribute of Array.from(element.attributes)) {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim().toLowerCase();
            if (
                name.startsWith('on') ||
                ((name === 'href' || name === 'src') &&
                    value.startsWith('javascript:'))
            ) {
                element.removeAttribute(attribute.name);
            }
        }

        if (element.tagName.toLowerCase() === 'a') {
            element.setAttribute('rel', 'nofollow noopener noreferrer');
        }
    }

    return template.innerHTML;
}

export function textFromHtml(html: string): string {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}
