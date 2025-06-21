# app/scraper.py

from playwright.sync_api import sync_playwright, Error

class PostScraper:
    """
    Handles scraping post data from X.com using Playwright.
    This class is isolated from the UI.
    """
    def fetch_post_data(self, url: str) -> dict | None:
        """
        Scrapes a given X.com URL for post details.

        Args:
            url: The full URL of the post to scrape.

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

                # Scrape author name and handle
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
                
                # Scrape post text
                post_text_element = post_article.query_selector('div[data-testid="tweetText"]')
                post_text = post_text_element.inner_text() if post_text_element else "Post content not found."
                
                # Scrape avatar URL
                avatar_element = post_article.query_selector('div[data-testid="Tweet-User-Avatar"] img')
                avatar_url = avatar_element.get_attribute('src') if avatar_element else None
                
                browser.close()

                return {
                    "author_name": author_name,
                    "author_handle": author_handle,
                    "post_text": post_text,
                    "avatar_url": avatar_url
                }
        except Error as e:
            print(f"Playwright Error: {e}")
            # This can happen if the page is private, deleted, or the selectors changed.
            return None
        except Exception as e:
            print(f"An unexpected error occurred during scraping: {e}")
            return None