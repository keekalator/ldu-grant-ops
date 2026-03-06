"""
LDU Grant Operations — Higgsfield AI Integration
Image-to-video and text-to-video generation for grant presentations,
Studio WELEH content, and Cultivation Campus storytelling.
"""

import os
import time
from pathlib import Path
from typing import Optional
from loguru import logger

try:
    import higgsfield_client as hf
    HIGGSFIELD_AVAILABLE = True
except ImportError:
    HIGGSFIELD_AVAILABLE = False
    logger.warning("higgsfield-client not installed. Run: pip install higgsfield-client")


# ---------------------------------------------------------------------------
# Model catalogue — easy to reference by name instead of raw endpoint string
# ---------------------------------------------------------------------------
MODELS = {
    # Fast preview — good for iteration and drafts
    "dop_preview":     "higgsfield-ai/dop/preview",
    # Full cinematic quality — use for final grant B-roll
    "dop_standard":    "higgsfield-ai/dop/standard",
    # ByteDance Seedance — smooth, photorealistic motion
    "seedance_pro":    "bytedance/seedance/v1/pro/image-to-video",
    "seedance_lite":   "bytedance/seedance/v1/lite/image-to-video",
    # Kling — advanced cinematic animations
    "kling_pro":       "kling-video/v2.1/pro/image-to-video",
    "kling_standard":  "kling-video/v2.1/standard/image-to-video",
    # WAN — stylised / artistic motion
    "wan":             "wan/v2.5/image-to-video",
}

# Cinematic motion prompts tailored for LDU's visual storytelling
LDU_MOTION_PRESETS = {
    "program_intro":
        "Smooth cinematic dolly push-in toward the subject, warm golden-hour lighting, "
        "shallow depth of field, South LA community energy",
    "grant_broll":
        "Slow cinematic pan right, subjects in natural activity, candid documentary style, "
        "warm amber grade, film grain texture",
    "studio_weleh":
        "Artistic slow orbit around the subject, vivid color pop, creative studio ambience, "
        "dynamic energy without losing elegance",
    "cultivation_campus":
        "Aerial-style pull-back revealing the full landscape, golden hour, lush greens, "
        "sense of scale and possibility",
    "founder_portrait":
        "Subtle handheld drift, subject facing camera with quiet confidence, "
        "rim light from behind, warm natural tones",
    "impact_report":
        "Time-lapse style motion, community in action, optimistic upward movement, "
        "bright and clear — progress and hope",
}


class HiggsfielClient:
    """
    Higgsfield AI client for LDU media generation.
    Wraps the official higgsfield-client SDK to match LDU's integration patterns.

    Usage:
        from integrations.higgsfield_client import higgsfield
        video_url = higgsfield.animate_image("path/to/photo.jpg", preset="grant_broll")
    """

    def __init__(self):
        if not HIGGSFIELD_AVAILABLE:
            raise RuntimeError(
                "higgsfield-client is not installed.\n"
                "Fix: pip install higgsfield-client"
            )

        api_key = os.environ.get("HIGGSFIELD_API_KEY") or os.environ.get("HF_API_KEY")
        api_secret = os.environ.get("HIGGSFIELD_API_SECRET") or os.environ.get("HF_API_SECRET")

        if not api_key or not api_secret:
            raise RuntimeError(
                "Higgsfield credentials not found.\n"
                "Add to your .env file:\n"
                "  HIGGSFIELD_API_KEY=your-key\n"
                "  HIGGSFIELD_API_SECRET=your-secret\n"
                "Get credentials at: https://cloud.higgsfield.ai"
            )

        # The SDK reads HF_API_KEY / HF_API_SECRET from environment automatically.
        # We set them here so the singleton pattern works regardless of load order.
        os.environ["HF_API_KEY"] = api_key
        os.environ["HF_API_SECRET"] = api_secret

        logger.info("HiggsfielClient initialized")

    # ------------------------------------------------------------------
    # PRIMARY METHOD — this is what you'll use 90% of the time
    # ------------------------------------------------------------------

    def animate_image(
        self,
        image_source: str,
        preset: str = "grant_broll",
        custom_prompt: Optional[str] = None,
        model: str = "dop_standard",
        duration: int = 5,
        aspect_ratio: str = "16:9",
        save_to: Optional[str] = None,
    ) -> dict:
        """
        Animate a static image into a cinematic video clip.

        Args:
            image_source: Local file path OR public URL to the source image
            preset:       LDU motion preset name (see LDU_MOTION_PRESETS keys)
                          Options: program_intro, grant_broll, studio_weleh,
                                   cultivation_campus, founder_portrait, impact_report
            custom_prompt: Override the preset with your own motion description
            model:        Model name key from MODELS dict (default: dop_standard)
            duration:     Video length in seconds — 5 or 10
            aspect_ratio: "16:9" (landscape), "9:16" (vertical/Reels), "1:1" (square)
            save_to:      Optional local path to save the video file

        Returns:
            dict with keys: video_url, request_id, model, duration, aspect_ratio, local_path
        """
        prompt = custom_prompt or LDU_MOTION_PRESETS.get(preset, LDU_MOTION_PRESETS["grant_broll"])
        endpoint = MODELS.get(model, MODELS["dop_standard"])

        # Upload local files first; pass URLs directly
        if image_source.startswith("http://") or image_source.startswith("https://"):
            image_url = image_source
        else:
            logger.info(f"Uploading local image: {image_source}")
            image_url = hf.upload_file(image_source)
            logger.info(f"Image uploaded: {image_url}")

        logger.info(f"Generating video — model={model}, preset={preset}, duration={duration}s")

        request_controller = hf.submit(
            endpoint,
            arguments={
                "image_url": image_url,
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
            },
        )

        # Poll with progress logging
        result = self._poll_with_progress(request_controller)

        video_url = (
            result.get("video_url")
            or result.get("output", {}).get("url")
            or result.get("url")
        )

        local_path = None
        if video_url and save_to:
            local_path = self._download_video(video_url, save_to)

        logger.success(f"Video generated: {video_url}")
        return {
            "video_url": video_url,
            "request_id": getattr(request_controller, "request_id", None),
            "model": model,
            "duration": duration,
            "aspect_ratio": aspect_ratio,
            "prompt": prompt,
            "local_path": local_path,
        }

    # ------------------------------------------------------------------
    # BATCH — animate multiple images at once (e.g. a grant photo set)
    # ------------------------------------------------------------------

    def animate_batch(
        self,
        images: list[dict],
        default_preset: str = "grant_broll",
        model: str = "dop_standard",
    ) -> list[dict]:
        """
        Animate a batch of images.

        Args:
            images: List of dicts, each with:
                    - "source": file path or URL
                    - "preset":  (optional) override preset per image
                    - "save_to": (optional) local save path
                    - "label":   (optional) descriptive name for logging
            default_preset: Preset to use when not overridden per image
            model:  Model to use for all images

        Returns:
            List of result dicts (same shape as animate_image)

        Example:
            results = higgsfield.animate_batch([
                {"source": "photos/program1.jpg", "preset": "program_intro", "label": "AI Lab"},
                {"source": "photos/farm.jpg",     "preset": "cultivation_campus", "label": "Farm"},
                {"source": "photos/weleh.jpg",    "preset": "studio_weleh", "label": "WELEH"},
            ])
        """
        results = []
        for i, item in enumerate(images):
            label = item.get("label", f"image_{i+1}")
            logger.info(f"Processing batch item {i+1}/{len(images)}: {label}")
            try:
                result = self.animate_image(
                    image_source=item["source"],
                    preset=item.get("preset", default_preset),
                    custom_prompt=item.get("prompt"),
                    model=model,
                    duration=item.get("duration", 5),
                    aspect_ratio=item.get("aspect_ratio", "16:9"),
                    save_to=item.get("save_to"),
                )
                result["label"] = label
                results.append(result)
            except Exception as e:
                logger.error(f"Failed on {label}: {e}")
                results.append({"label": label, "error": str(e), "video_url": None})
        return results

    # ------------------------------------------------------------------
    # TEXT-TO-VIDEO (no source image needed)
    # ------------------------------------------------------------------

    def generate_from_text(
        self,
        prompt: str,
        duration: int = 5,
        aspect_ratio: str = "16:9",
        save_to: Optional[str] = None,
    ) -> dict:
        """
        Generate a video purely from a text description using DoP preview.

        Args:
            prompt:       Describe what you want to see
            duration:     5 or 10 seconds
            aspect_ratio: "16:9", "9:16", or "1:1"
            save_to:      Optional local save path

        Returns:
            dict with video_url, request_id, local_path
        """
        logger.info(f"Text-to-video: {prompt[:80]}...")

        request_controller = hf.submit(
            MODELS["dop_preview"],
            arguments={
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
            },
        )

        result = self._poll_with_progress(request_controller)
        video_url = result.get("video_url") or result.get("output", {}).get("url")

        local_path = None
        if video_url and save_to:
            local_path = self._download_video(video_url, save_to)

        logger.success(f"Text-to-video generated: {video_url}")
        return {
            "video_url": video_url,
            "request_id": getattr(request_controller, "request_id", None),
            "prompt": prompt,
            "duration": duration,
            "aspect_ratio": aspect_ratio,
            "local_path": local_path,
        }

    # ------------------------------------------------------------------
    # INTERNAL HELPERS
    # ------------------------------------------------------------------

    def _poll_with_progress(self, request_controller, timeout_seconds: int = 300) -> dict:
        """Poll a request controller until complete, logging status every 15 seconds."""
        start = time.time()
        for status in request_controller.poll_request_status():
            elapsed = int(time.time() - start)
            if isinstance(status, hf.Queued):
                if elapsed % 15 == 0:
                    logger.info(f"Status: Queued ({elapsed}s elapsed)")
            elif isinstance(status, hf.InProgress):
                if elapsed % 15 == 0:
                    logger.info(f"Status: Generating... ({elapsed}s elapsed)")
            elif isinstance(status, hf.Completed):
                logger.info(f"Status: Completed in {elapsed}s")
                break
            elif isinstance(status, (hf.Failed, hf.NSFW, hf.Cancelled)):
                raise RuntimeError(f"Generation failed: {status}")
            if elapsed > timeout_seconds:
                raise TimeoutError(f"Generation timed out after {timeout_seconds}s")
        return request_controller.get()

    def _download_video(self, url: str, save_to: str) -> str:
        """Download a video from URL to a local path."""
        import httpx
        Path(save_to).parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Downloading video to {save_to}")
        with httpx.stream("GET", url) as r:
            with open(save_to, "wb") as f:
                for chunk in r.iter_bytes(chunk_size=8192):
                    f.write(chunk)
        logger.success(f"Video saved: {save_to}")
        return save_to

    @staticmethod
    def list_presets() -> dict:
        """Return all available LDU motion presets with their descriptions."""
        return LDU_MOTION_PRESETS

    @staticmethod
    def list_models() -> dict:
        """Return all available model name keys and their endpoint strings."""
        return MODELS


# Singleton instance — import this everywhere
higgsfield = HiggsfielClient() if HIGGSFIELD_AVAILABLE else None
