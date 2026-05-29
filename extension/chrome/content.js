function momentumExtractJobPage() {
  const selectors = [
    "[data-automation-id='jobPostingDescription']",
    ".posting",
    ".job",
    ".job-description",
    ".description",
    "main",
    "body"
  ];

  const target = selectors.map((selector) => document.querySelector(selector)).find(Boolean) || document.body;
  const text = target.innerText.replace(/\s+/g, " ").trim();

  return {
    title: document.title,
    url: window.location.href,
    text: text.slice(0, 24000)
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "MOMENTUMAI_EXTRACT_JOB") {
    sendResponse(momentumExtractJobPage());
  }
});
