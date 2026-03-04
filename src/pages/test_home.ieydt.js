$w.onReady(function () {
    const htmlEmbed = $w('#html1');
    
    htmlEmbed.onMessage((event) => {
        if (!event.data) return;
        
        let height = null;
        
        if (event.data.type === 'BANF_EMBED_HEIGHT') {
            height = event.data.height;
        } else if (event.data.height) {
            height = event.data.height;
        }
        
        if (height && height > 0) {
            console.log('[BANF] Content height is:', height, 'px');
            // HtmlComponent doesn't support .style - height must be set in Editor
        }
    });
});