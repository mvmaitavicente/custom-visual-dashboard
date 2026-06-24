export async function copyTextToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // Power BI can expose the Clipboard API while denying it inside the visual iframe.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let copied = false;
    try {
        copied = document.execCommand("copy");
    } catch {
        copied = false;
    } finally {
        textarea.remove();
    }

    return copied;
}

export async function runCopyAction(
    text: string,
    button: HTMLButtonElement
): Promise<void> {
    const originalText = button.textContent || "Copiar";
    const copied = await copyTextToClipboard(text);

    button.classList.toggle("copied", copied);
    button.classList.toggle("copy-error", !copied);
    button.textContent = copied ? "Copiado" : "Error";

    window.setTimeout(() => {
        button.classList.remove("copied", "copy-error");
        button.textContent = originalText;
    }, 1600);
}

export function cleanTsvValue(value: unknown): string {
    return String(value ?? "")
        .replace(/\t/g, " ")
        .replace(/\r?\n/g, " ")
        .trim();
}
