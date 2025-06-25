# app/scraper.py

from playwright.sync_api import sync_playwright, Error
import re
import json

class PostScraper:
    """
    Handles scraping post data from X.com using Playwright.
    This class is isolated from the UI.
    """
    def _extract_resources(self, text: str) -> str | None:
        """
        Uses Regex to find valuable resource links within post text.
        
        Args:
            text: The full text of the post.

        Returns:
            A JSON string of found URLs, or None if none are found.
        """
        url_pattern = r'https?://[^\s/$.?#].[^\s]*'
        
        resource_domains = [
            'github.com',
            'huggingface.co',
            'arxiv.org',
            'colab.research.google.com',
            'gist.github.com'
        ]
        
        found_urls = re.findall(url_pattern, text)
        resource_links = []
        
        for url in found_urls:
            cleaned_url = url.rstrip('.,)!"\'')
            if any(domain in cleaned_url for domain in resource_domains):
                resource_links.append(cleaned_url)
        
        if not resource_links:
            return None
            
        return json.dumps(list(set(resource_links)))

    def fetch_post_data(self, url: str) -> dict | None:
        """
        Scrapes a given X.com URL for post details.

        Returns:
            A dictionary with scraped data if successful, otherwise None.
        """
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch()
                page = browser.new_page()
                page.goto(url, wait_until='domcontentloaded', timeout=20000)
                
                article_selector = 'article[data-testid="tweet"]'
                page.wait_for_selector(article_selector, timeout=15000)
                post_article = page.query_selector(article_selector)

                if not post_article:
                    browser.close()
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
                
                browser.close()

                resources = self._extract_resources(post_text)

                # --- NEW: Explicitly define the 'content' for our RAG engine ---
                # For now, the post_text is the best content we have.
                # In the future, this logic could be expanded to fetch content from resource links.
                content_for_rag = post_text

                return {
                    "author_name": author_name,
                    "author_handle": author_handle,
                    "post_text": post_text,
                    "avatar_url": avatar_url,
                    "resources": resources,
                    # --- ADDED: Include the content in the returned data ---
                    "content": content_for_rag
                }
        except Error as e:
            print(f"Playwright Error: {e}")
            return None
        except Exception as e:
            print(f"An unexpected error occurred during scraping: {e}")
            return None