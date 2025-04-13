// index.js

const express = require("express");
const puppeteer = require("puppeteer");
const app = express();

app.get("/crawl", async (req, res) => {
  const query = req.query.q || "미즈노 수영복";
  const encoded = encodeURIComponent(query);
  const maxItems = 40;
  const baseUrl = `https://www.coupang.com/np/search?q=${encoded}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/113.0.0.0 Safari/537.36"
  );

  let results = [];
  let pageIndex = 1;

  while (results.length < maxItems) {
    const url = `${baseUrl}&page=${pageIndex}`;
    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForSelector(".search-product");

    const pageData = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".search-product"));
      return items.map(el => {
        const titleEl = el.querySelector(".name");
        const priceEl = el.querySelector(".price-value");
        const ratingEl = el.querySelector(".rating");
        const reviewEl = el.querySelector(".rating-total-count");
        const imageEl = el.querySelector("img");
        const linkEl = el.querySelector("a.search-product-link");
        const deliveryEl = el.querySelector(".delivery-info") || el.querySelector(".badge.rocket");

        return {
          productName: titleEl?.innerText ?? null,
          price: priceEl?.innerText ?? null,
          rating: ratingEl?.innerText ?? null,
          reviewCount: reviewEl?.innerText?.replace(/[()]/g, "") ?? null,
          imageUrl: imageEl?.src ?? null,
          productUrl: linkEl ? "https://www.coupang.com" + linkEl.getAttribute("href") : null,
          deliveryTag: deliveryEl?.innerText ?? null,
        };
      });
    });

    results.push(...pageData.filter(p => p.productName));
    if (pageData.length === 0) break; // 더 이상 결과 없음
    pageIndex++;
  }

  await browser.close();
  res.json(results.slice(0, maxItems));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
