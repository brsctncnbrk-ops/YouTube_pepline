import { Config } from "@remotion/cli/config";

/**
 * The public dir is the per-project root (two levels up from this
 * render_ready_project/ folder: render_ready_project -> remotion -> project
 * root). That makes staticFile("assets/images/scene_001.png") resolve to the
 * project's own assets folder, so the relative paths stored in
 * asset_map.json map 1:1 to staticFile() calls and large LFS binaries are
 * never duplicated into this project's own public/ folder.
 */
Config.setPublicDir("../../");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
