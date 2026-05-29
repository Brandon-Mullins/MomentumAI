chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "momentumai-analyze",
    title: "Analyze in MomentumAI",
    contexts: ["page", "selection", "link"]
  });
});

chrome.contextMenus.onClicked.addListener(async (_info, tab) => {
  if (!tab?.id) return;

  try {
    const extracted = await chrome.tabs.sendMessage(tab.id, { type: "MOMENTUMAI_EXTRACT_JOB" });
    const encoded = encodeURIComponent(
      JSON.stringify({
        url: extracted.url || tab.url,
        title: extracted.title || tab.title,
        text: extracted.text
      })
    );
    await chrome.tabs.create({ url: `http://localhost:5173/?importJob=${encoded}` });
  } catch {
    const encoded = encodeURIComponent(JSON.stringify({ url: tab.url, title: tab.title }));
    await chrome.tabs.create({ url: `http://localhost:5173/?importJob=${encoded}` });
  }
});
