"""Anthropic API 비동기 클라이언트 (재시도, 동시성 제어)"""

from __future__ import annotations

import asyncio
import json
import logging

import anthropic

logger = logging.getLogger(__name__)


class LLMClient:
    """비동기 LLM 호출 클라이언트"""

    def __init__(
        self,
        model: str = "claude-sonnet-4-20250514",
        fast_model: str = "claude-haiku-4-5-20251001",
        max_retries: int = 3,
        concurrency: int = 10,
    ):
        self.client = anthropic.AsyncAnthropic()
        self.model = model
        self.fast_model = fast_model
        self.max_retries = max_retries
        self._semaphore = asyncio.Semaphore(concurrency)

    async def call(
        self,
        system: str,
        user: str,
        *,
        use_fast: bool = False,
        max_tokens: int = 1024,
    ) -> dict:
        """
        단일 LLM 호출 (세마포어 + 지수 백오프 재시도).

        Returns:
            파싱된 JSON dict. 파싱 실패 시 {"raw": 텍스트} 반환.
        """
        model = self.fast_model if use_fast else self.model

        async with self._semaphore:
            for attempt in range(self.max_retries):
                try:
                    response = await self.client.messages.create(
                        model=model,
                        max_tokens=max_tokens,
                        system=system,
                        messages=[{"role": "user", "content": user}],
                    )

                    text = response.content[0].text.strip()

                    # JSON 파싱 시도
                    # ```json ... ``` 블록 처리
                    if text.startswith("```"):
                        text = text.split("\n", 1)[1]
                        if text.endswith("```"):
                            text = text[:-3].strip()

                    try:
                        return json.loads(text)
                    except json.JSONDecodeError:
                        return {"raw": text}

                except anthropic.RateLimitError:
                    wait = 2 ** (attempt + 1)
                    logger.warning(f"Rate limit, waiting {wait}s (attempt {attempt + 1})")
                    await asyncio.sleep(wait)
                except anthropic.APIError as e:
                    if attempt == self.max_retries - 1:
                        logger.error(f"API error after {self.max_retries} attempts: {e}")
                        return {"error": str(e)}
                    wait = 2 ** attempt
                    logger.warning(f"API error, retrying in {wait}s: {e}")
                    await asyncio.sleep(wait)

        return {"error": "max retries exceeded"}
