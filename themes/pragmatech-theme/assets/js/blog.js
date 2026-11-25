const readCodeWithoutLineNumbers = (codeFigure) => {
    const codeClone = codeFigure.querySelector('pre code').cloneNode(true);
    codeClone.querySelectorAll('.ln').forEach((lineNumber) => lineNumber.remove());
    return codeClone.textContent;
};

const setupCopyButtons = () => {
    document.querySelectorAll('.blog-code__copy').forEach((copyButton) => {
        copyButton.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(readCodeWithoutLineNumbers(copyButton.closest('.blog-code')));
                copyButton.textContent = 'Copied';
            } catch (error) {
                copyButton.textContent = 'Copy failed';
            }
            setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
        });
    });
};

document.addEventListener('DOMContentLoaded', setupCopyButtons);
