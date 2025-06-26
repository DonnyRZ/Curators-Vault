# app/scraper.py

from playwright.sync_api import sync_playwright, Error
import re
import json
import os # --- UPGRADE: Need this for path handling

class PostScraper:
    """
    Handles scraping post data from X.com using Playwright with a persistent,
    authenticated browser session to bypass login walls.
    """
    def __init__(self):
        # --- UPGRADE: Define a path to store our browser's user data (cookies, etc.) ---
        # This will create a 'playwright_user_data' folder in your project root.
        self.user_data_dir = os.path.join(os.path.dirname(__file__), '..', 'playwright_user_data')
        if not os.path.exists(self.user_data_dir):
            os.makedirs(self.user_data_dir)

    def _extract_resources(self, text: str) -> str | None:
        """
        Uses Regex to find valuable resource links within post text.
        """
        url_pattern = r'https?://[^\s/$.?#].[^\s]*'
        resource_domains = [
            'github.com', 'huggingface.co', 'arxiv.org',
            'colab.research.google.com', 'gist.github.com'
        ]
        found_urls = re.findall(url_pattern, text)
        resource_links = [
            url.rstrip('.,)!"\'') for url in found_urls 
            if any(domain in url for domain in resource_domains)
        ]
        return json.dumps(list(set(resource_links))) if resource_links else None

    def fetch_post_data(self, url: str) -> dict | None:
        """
        Scrapes a given X.com URL using a persistent browser context.
        """
        try:
            with sync_playwright() as p:
                # --- THE MASTER KEY UPGRADE ---
                # We now launch a persistent context. It will save all cookies and login
                # data to the user_data_dir we defined.
                # headless=False is REQUIRED so you can log in the first time.
                context = p.chromium.launch_persistent_context(
                    self.user_data_dir, 
                    headless=False,
                    slow_mo=50  # Adds a small delay to make actions more human-like
                )
                
                page = context.new_page()
                
                print(f"Navigating to {url} with authenticated session...")
                page.goto(url, wait_until='domcontentloaded', timeout=30000)
                
                article_selector = 'article[data-testid="tweet"]'
                page.wait_for_selector(article_selector, timeout=30000)
                
                post_article = page.query_selector(article_selector)

                if not post_article:
                    context.close()
                    return None

                author_name = "Author Not Found"
                author_handle = "@handle_not_found"
                user_container = post_article.query_selector('div[data-testid="User-Name"]')
                if user_container:
                    spans = user_container.query_selector_all('span')
                    if len(spans) >= 1:
                        author_name = spans[0].inner_text().strip()
                    for span in spans:
                        if span.inner_text().strip().startswith('@'):
                            author_handle = span.inner_text().strip()
                            break
                
                post_text_element = post_article.query_selector('div[data-testid="tweetText"]')
                post_text = post_text_element.inner_text() if post_text_element else "Post content not found."
                
                avatar_element = post_article.query_selector('div[data-testid="Tweet-User-Avatar"] img')
                avatar_url = avatar_element.get_attribute('src') if avatar_element else None
                
                context.close()

                resources = self._extract_resources(post_text)
                content_for_rag = post_text

                return {
                    "author_name": author_name,
                    "author_handle": author_handle,
                    "post_text": post_text,
                    "avatar_url": avatar_url,
                    "resources": resources,
                    "content": content_for_rag
                }
        except Error as e:
            print(f"Playwright Error: {e}")
            return None
        except Exception as e:
            print(f"An unexpected error occurred during scraping: {e}")
            return None