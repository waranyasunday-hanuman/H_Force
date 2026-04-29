const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\USER\\Desktop\\OAPIManual Create SO.htm', 'utf8');

const matches = content.match(/<li[^>]*id=['"]?(account_[^'"]+)['"]?[^>]*>([\s\S]*?)<\/li>/gi);
if (matches) {
    matches.forEach(m => {
        // extract title attribute or text
        const titleMatch = m.match(/title=['"]([^'"]+)['"]/);
        const textMatch = m.match(/>([^<]+)<\/a>/);
        if (titleMatch && textMatch) {
            console.log(titleMatch[1], "=>", textMatch[1].trim());
        }
    });
} else {
    console.log("No account APIs found");
}
