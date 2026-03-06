"""
LDU Grant Operations — Media / Video Agent
Generates cinematic B-roll and presentation videos for grant packages,
impact reports, and social content using Higgsfield AI.
"""

from pathlib import Path
from typing import Optional
from agents.base_agent import BaseAgent
from integrations.higgsfield_client import HiggsfielClient, LDU_MOTION_PRESETS


class VideoAgent(BaseAgent):
    """
    Automates image-to-video generation for LDU content pipelines.

    Typical uses:
    - Grant presentation B-roll from program photos
    - Impact report visuals
    - Studio WELEH social media clips
    - Cultivation Campus storytelling videos
    - Founder portrait animations for pitch decks
    """

    def __init__(self):
        super().__init__("VideoAgent")
        self.hf = HiggsfielClient()
        self.output_dir = Path("data/media/videos")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def run(self, task: dict) -> dict:
        """
        Execute a video generation task.

        Task dict keys:
            type:          "animate_image" | "batch" | "text_to_video"
            source:        Image path or URL (for animate_image)
            images:        List of image dicts (for batch)
            prompt:        Text prompt (for text_to_video or custom prompt)
            preset:        LDU preset name (default: "grant_broll")
            model:         Model key (default: "dop_standard")
            duration:      Seconds, 5 or 10 (default: 5)
            aspect_ratio:  "16:9" | "9:16" | "1:1" (default: "16:9")
            output_name:   Filename for saved video (optional)
            pillar:        LDU pillar context for auto-preset selection (optional)

        Returns:
            dict with video_url, local_path, and full generation metadata
        """
        task_type = task.get("type", "animate_image")
        self.log_activity("run", f"task_type={task_type}")

        if task_type == "animate_image":
            return self._animate_single(task)
        elif task_type == "batch":
            return self._animate_batch(task)
        elif task_type == "text_to_video":
            return self._text_to_video(task)
        else:
            raise ValueError(f"Unknown task type: {task_type}. Use animate_image, batch, or text_to_video")

    # ------------------------------------------------------------------
    # GRANT PACKAGE HELPER — most useful for the grant operations workflow
    # ------------------------------------------------------------------

    def create_grant_broll(
        self,
        photo_paths: list[str],
        grant_name: str,
        pillar: str = "P2",
        aspect_ratio: str = "16:9",
    ) -> list[dict]:
        """
        Create a set of B-roll clips from grant program photos.
        Automatically picks the best motion preset per pillar.

        Args:
            photo_paths:  List of local image paths
            grant_name:   Name of the grant (used for output filenames)
            pillar:       LDU pillar ID — determines motion style
            aspect_ratio: Output format

        Returns:
            List of result dicts with video_url and local_path per clip

        Example:
            agent = VideoAgent()
            clips = agent.create_grant_broll(
                photo_paths=["photos/program1.jpg", "photos/youth.jpg"],
                grant_name="California Arts Council 2026",
                pillar="P3",
            )
        """
        preset = self._pillar_to_preset(pillar)
        safe_name = grant_name.replace(" ", "_").lower()[:40]

        images = [
            {
                "source": path,
                "preset": preset,
                "aspect_ratio": aspect_ratio,
                "save_to": str(self.output_dir / f"{safe_name}_clip{i+1}.mp4"),
                "label": f"{grant_name} — clip {i+1}",
            }
            for i, path in enumerate(photo_paths)
        ]

        self.log_activity("create_grant_broll", f"{grant_name} | {len(images)} clips | pillar={pillar}")
        results = self.hf.animate_batch(images, default_preset=preset)
        self.log_success("create_grant_broll", f"{len(results)} clips generated for {grant_name}")
        return results

    def create_social_reel(
        self,
        photo_path: str,
        caption_context: str = "",
        platform: str = "instagram",
    ) -> dict:
        """
        Create a vertical 9:16 short-form video clip for social media.

        Args:
            photo_path:      Source image
            caption_context: Brief description of what's happening (helps prompt)
            platform:        "instagram" | "tiktok" | "youtube_shorts"

        Returns:
            dict with video_url and local_path
        """
        timestamp = Path(photo_path).stem
        save_path = str(self.output_dir / f"social_{timestamp}.mp4")

        custom_prompt = None
        if caption_context:
            custom_prompt = (
                f"Cinematic slow motion animation, {caption_context}. "
                "Warm South LA energy, authentic community, vibrant and purposeful."
            )

        self.log_activity("create_social_reel", f"platform={platform} | {photo_path}")
        return self.hf.animate_image(
            image_source=photo_path,
            preset="studio_weleh",
            custom_prompt=custom_prompt,
            model="dop_standard",
            duration=5,
            aspect_ratio="9:16",
            save_to=save_path,
        )

    def create_founder_portrait(self, photo_path: str, founder_name: str = "Kika Keith") -> dict:
        """
        Animate a founder portrait for pitch decks and impact reports.

        Args:
            photo_path:   Path to founder headshot or portrait
            founder_name: Used for output filename

        Returns:
            dict with video_url and local_path
        """
        safe_name = founder_name.replace(" ", "_").lower()
        save_path = str(self.output_dir / f"founder_{safe_name}.mp4")

        self.log_activity("create_founder_portrait", founder_name)
        return self.hf.animate_image(
            image_source=photo_path,
            preset="founder_portrait",
            model="dop_standard",
            duration=5,
            aspect_ratio="16:9",
            save_to=save_path,
        )

    # ------------------------------------------------------------------
    # INTERNAL TASK DISPATCHERS
    # ------------------------------------------------------------------

    def _animate_single(self, task: dict) -> dict:
        output_name = task.get("output_name", "video_output.mp4")
        save_to = str(self.output_dir / output_name)
        return self.hf.animate_image(
            image_source=task["source"],
            preset=task.get("preset", "grant_broll"),
            custom_prompt=task.get("prompt"),
            model=task.get("model", "dop_standard"),
            duration=task.get("duration", 5),
            aspect_ratio=task.get("aspect_ratio", "16:9"),
            save_to=save_to,
        )

    def _animate_batch(self, task: dict) -> dict:
        results = self.hf.animate_batch(
            images=task["images"],
            default_preset=task.get("preset", "grant_broll"),
            model=task.get("model", "dop_standard"),
        )
        return {"results": results, "count": len(results)}

    def _text_to_video(self, task: dict) -> dict:
        output_name = task.get("output_name", "text_to_video_output.mp4")
        save_to = str(self.output_dir / output_name)
        return self.hf.generate_from_text(
            prompt=task["prompt"],
            duration=task.get("duration", 5),
            aspect_ratio=task.get("aspect_ratio", "16:9"),
            save_to=save_to,
        )

    @staticmethod
    def _pillar_to_preset(pillar: str) -> str:
        """Map LDU pillar ID to the most appropriate motion preset."""
        mapping = {
            "P1": "impact_report",         # Capital Campaign — gravitas
            "P2": "program_intro",          # Programming & Operations — community
            "P3": "studio_weleh",           # Studio WELEH — artistic energy
            "P4": "cultivation_campus",     # Agricultural — wide, landscape
            "P5": "founder_portrait",       # Founder & Enterprise — person-forward
            "CROSS": "grant_broll",         # Textile Sustainability — documentary
        }
        return mapping.get(pillar.upper(), "grant_broll")

    @staticmethod
    def list_presets() -> None:
        """Print all available LDU motion presets."""
        print("\nAvailable LDU Motion Presets:")
        print("-" * 50)
        for name, description in LDU_MOTION_PRESETS.items():
            print(f"  {name:<22} {description[:60]}...")
        print()
