#!/usr/bin/env python3
"""
LDU Grant Operations — Image-to-Video CLI
==========================================
Animate any photo into a cinematic video clip using Higgsfield AI.

QUICKSTART — run from the project root:
    python scripts/animate_image.py photo.jpg

EXAMPLES:
    # Animate a program photo for a grant package
    python scripts/animate_image.py photos/program.jpg

    # Choose a specific style preset
    python scripts/animate_image.py photos/farm.jpg --preset cultivation_campus

    # Vertical format for Instagram/Reels
    python scripts/animate_image.py photos/weleh.jpg --preset studio_weleh --format vertical

    # Batch: animate every .jpg in a folder
    python scripts/animate_image.py photos/ --batch --preset grant_broll

    # Text-to-video (no image needed)
    python scripts/animate_image.py --text "Youth learning music production at LDU Crenshaw campus"

    # List all available style presets
    python scripts/animate_image.py --list-presets

SETUP (first time only):
    1. Create a free Higgsfield account: https://cloud.higgsfield.ai
    2. Get your API key and secret from the dashboard
    3. Add to your .env file:
           HIGGSFIELD_API_KEY=your-key-here
           HIGGSFIELD_API_SECRET=your-secret-here
"""

import sys
import os
import argparse
from pathlib import Path
from datetime import datetime

# Allow running from the project root
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load .env before importing anything that reads environment variables
from dotenv import load_dotenv
load_dotenv()

from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich import print as rprint

console = Console()

# ---------------------------------------------------------------------------
# Preset descriptions for the --list-presets display
# ---------------------------------------------------------------------------
PRESET_INFO = {
    "grant_broll":          ("All pillars",       "Documentary-style pan — safe choice for any grant photo"),
    "program_intro":        ("P2 Programs",       "Cinematic push-in — programs, classes, workshops"),
    "studio_weleh":         ("P3 Studio WELEH",   "Artistic orbit — art, apparel, creative content"),
    "cultivation_campus":   ("P4 Farm",           "Wide aerial pull-back — farm, land, landscape"),
    "founder_portrait":     ("P5 Founder",        "Subtle drift — headshots, founder photos, portraits"),
    "impact_report":        ("P1 Capital",        "Upward crane — buildings, facility, progress shots"),
}


def list_presets():
    """Print a nicely formatted table of all motion presets."""
    table = Table(title="LDU Motion Presets", show_header=True, header_style="bold cyan")
    table.add_column("Preset Name",     style="bold yellow", width=24)
    table.add_column("Best For",        style="cyan",        width=20)
    table.add_column("Description",     width=52)

    for name, (pillar, desc) in PRESET_INFO.items():
        table.add_row(name, pillar, desc)

    console.print(table)
    console.print("\n[dim]Usage: python scripts/animate_image.py photo.jpg --preset [preset_name][/dim]\n")


def animate_single(image_path: str, args) -> dict:
    """Animate a single image file."""
    from integrations.higgsfield_client import HiggsfielClient

    hf = HiggsfielClient()

    aspect_map = {
        "landscape": "16:9",
        "vertical":  "9:16",
        "square":    "1:1",
        "16:9":      "16:9",
        "9:16":      "9:16",
        "1:1":       "1:1",
    }
    aspect_ratio = aspect_map.get(args.format, "16:9")

    stem = Path(image_path).stem
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = Path("data/media/videos")
    output_dir.mkdir(parents=True, exist_ok=True)
    save_to = str(output_dir / f"{stem}_{timestamp}.mp4")

    console.print(f"\n[bold cyan]Animating:[/bold cyan] {image_path}")
    console.print(f"[dim]Preset:    {args.preset}[/dim]")
    console.print(f"[dim]Model:     {args.model}[/dim]")
    console.print(f"[dim]Format:    {aspect_ratio}  •  {args.duration}s[/dim]")
    console.print(f"[dim]Saving to: {save_to}[/dim]\n")

    result = hf.animate_image(
        image_source=image_path,
        preset=args.preset,
        custom_prompt=args.prompt or None,
        model=args.model,
        duration=args.duration,
        aspect_ratio=aspect_ratio,
        save_to=save_to,
    )
    return result


def animate_batch(folder: str, args) -> list:
    """Animate all .jpg / .png images in a folder."""
    from integrations.higgsfield_client import HiggsfielClient

    hf = HiggsfielClient()
    folder_path = Path(folder)
    image_files = list(folder_path.glob("*.jpg")) + list(folder_path.glob("*.jpeg")) + list(folder_path.glob("*.png"))

    if not image_files:
        console.print(f"[red]No images found in {folder}[/red]")
        sys.exit(1)

    console.print(f"\n[bold cyan]Batch mode:[/bold cyan] {len(image_files)} images in {folder}")

    aspect_map = {"landscape": "16:9", "vertical": "9:16", "square": "1:1"}
    aspect_ratio = aspect_map.get(args.format, "16:9")

    output_dir = Path("data/media/videos")
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    images = [
        {
            "source": str(img),
            "preset": args.preset,
            "aspect_ratio": aspect_ratio,
            "duration": args.duration,
            "save_to": str(output_dir / f"{img.stem}_{timestamp}.mp4"),
            "label": img.name,
        }
        for img in image_files
    ]

    return hf.animate_batch(images, default_preset=args.preset, model=args.model)


def text_to_video(args) -> dict:
    """Generate video from a text description."""
    from integrations.higgsfield_client import HiggsfielClient

    hf = HiggsfielClient()

    aspect_map = {"landscape": "16:9", "vertical": "9:16", "square": "1:1"}
    aspect_ratio = aspect_map.get(args.format, "16:9")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = Path("data/media/videos")
    output_dir.mkdir(parents=True, exist_ok=True)
    save_to = str(output_dir / f"text_to_video_{timestamp}.mp4")

    console.print(f"\n[bold cyan]Text-to-Video:[/bold cyan]")
    console.print(f"[dim]{args.text}[/dim]\n")

    return hf.generate_from_text(
        prompt=args.text,
        duration=args.duration,
        aspect_ratio=aspect_ratio,
        save_to=save_to,
    )


def print_result(result: dict):
    """Print a nicely formatted result summary."""
    console.print("\n[bold green]Done![/bold green]")
    if result.get("video_url"):
        console.print(f"[bold]Video URL:[/bold] [underline blue]{result['video_url']}[/underline blue]")
    if result.get("local_path"):
        console.print(f"[bold]Saved to: [/bold] {result['local_path']}")
    console.print()


def print_batch_results(results: list):
    """Print a summary table for batch results."""
    table = Table(title="Batch Results", show_header=True, header_style="bold cyan")
    table.add_column("File",      style="bold",  width=30)
    table.add_column("Status",    width=10)
    table.add_column("Video URL", width=55)

    for r in results:
        label = r.get("label", "—")
        if r.get("error"):
            table.add_row(label, "[red]FAILED[/red]", r["error"][:55])
        else:
            url = r.get("video_url", "—")
            table.add_row(label, "[green]OK[/green]", url[:55] if url else "—")

    console.print(table)


def main():
    parser = argparse.ArgumentParser(
        description="Animate LDU photos into cinematic videos using Higgsfield AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    parser.add_argument(
        "source",
        nargs="?",
        help="Image file path, folder path (with --batch), or omit for --text mode",
    )
    parser.add_argument(
        "--preset", "-p",
        default="grant_broll",
        choices=list(PRESET_INFO.keys()),
        help="Motion style preset (default: grant_broll)",
    )
    parser.add_argument(
        "--model", "-m",
        default="dop_standard",
        choices=["dop_preview", "dop_standard", "seedance_pro", "seedance_lite", "kling_pro", "kling_standard", "wan"],
        help="AI model (default: dop_standard — best quality)",
    )
    parser.add_argument(
        "--format", "-f",
        default="landscape",
        choices=["landscape", "vertical", "square"],
        help="Video format: landscape=16:9, vertical=9:16, square=1:1 (default: landscape)",
    )
    parser.add_argument(
        "--duration", "-d",
        type=int,
        default=5,
        choices=[5, 10],
        help="Video duration in seconds: 5 or 10 (default: 5)",
    )
    parser.add_argument(
        "--prompt",
        help="Custom motion description (overrides preset)",
    )
    parser.add_argument(
        "--text", "-t",
        help="Generate video from text description (no image needed)",
    )
    parser.add_argument(
        "--batch", "-b",
        action="store_true",
        help="Animate all images in the source folder",
    )
    parser.add_argument(
        "--list-presets",
        action="store_true",
        help="Show all available motion presets and exit",
    )

    args = parser.parse_args()

    # Show preset list and exit
    if args.list_presets:
        list_presets()
        return

    # Text-to-video mode
    if args.text:
        result = text_to_video(args)
        print_result(result)
        return

    # Require a source for all other modes
    if not args.source:
        console.print("[red]Error:[/red] Provide an image path, folder path, or use --text.\n")
        parser.print_help()
        sys.exit(1)

    # Batch mode
    if args.batch or Path(args.source).is_dir():
        results = animate_batch(args.source, args)
        print_batch_results(results)
        return

    # Single image
    result = animate_single(args.source, args)
    print_result(result)


if __name__ == "__main__":
    main()
