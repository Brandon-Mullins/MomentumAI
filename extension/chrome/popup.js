const DEFAULT_APP_URL = "http://localhost:5173";

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function extractJob(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "MOMENTUMAI_EXTRACT_JOB" });
  } catch {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        title: document.title,
        url: window.location.href,
        text: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 24000)
      })
    });
    return result.result;
  }
}

document.getElementById("analyze").addEventListener("click", async () => {
  const button = document.getElementById("analyze");
  const notes = document.getElementById("notes").value.trim();
  button.textContent = "Capturing...";
  button.disabled = true;

  try {
    const tab = await getActiveTab();
    const extracted = await extractJob(tab.id);
    const payload = {
      url: extracted.url || tab.url,
      title: extracted.title || tab.title,
      text: extracted.text,
      recruiterEmail: notes
    };
    const encoded = encodeURIComponent(JSON.stringify(payload));
    await chrome.tabs.create({ url: `${DEFAULT_APP_URL}/?importJob=${encoded}` });
    window.close();
  } finally {
    button.textContent = "Analyze in MomentumAI";
    button.disabled = false;
  }
});
