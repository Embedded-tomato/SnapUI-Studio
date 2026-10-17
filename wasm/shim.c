/* LVGL WASM 桥接层：显示帧缓冲 + 鼠标输入 + 手动 tick
 * zig cc -target wasm32-freestanding 编译，导出供 JS 调用
 */
#include <lvgl/lvgl.h>
#include <stdlib.h>
#include "ui.h"

static lv_display_t *disp;
static lv_indev_t *mouse;
static uint8_t *fb;            /* RGBA8888 帧缓冲 */
static int fb_w, fb_h;
static int dirty;

static void flush_cb(lv_display_t *d, const lv_area_t *area, uint8_t *px_map)
{
    /* LVGL XRGB8888 → canvas RGBA8888 */
    int w = area->x2 - area->x1 + 1;
    for (int y = area->y1; y <= area->y2; y++) {
        uint32_t *src = (uint32_t *)px_map + (y - area->y1) * w;
        uint32_t *dst = (uint32_t *)fb + y * fb_w + area->x1;
        for (int x = 0; x < w; x++) {
            uint32_t p = src[x];
            dst[x] = (p & 0x00FFFFFF) | 0xFF000000;
        }
    }
    dirty = 1;
    lv_display_flush_ready(d);
}

static lv_point_t mouse_pt;
static uint8_t mouse_down;

static void mouse_read(lv_indev_t *indev, lv_indev_data_t *data)
{
    data->point.x = mouse_pt.x;
    data->point.y = mouse_pt.y;
    data->state = mouse_down ? LV_INDEV_STATE_PRESSED : LV_INDEV_STATE_RELEASED;
}

__attribute__((export_name("sim_init")))
int sim_init(int w, int h)
{
    fb_w = w; fb_h = h;
    fb = malloc((size_t)w * h * 4);
    if (!fb) return -1;

    lv_init();
    disp = lv_display_create(w, h);
    lv_display_set_color_format(disp, LV_COLOR_FORMAT_XRGB8888);
    lv_display_set_flush_cb(disp, flush_cb);
    /* 全屏缓冲，渲染模式 FULL 简化 JS 端 */
    lv_display_set_buffers(disp, fb, NULL, w * h * 4, LV_DISPLAY_RENDER_MODE_FULL);

    mouse = lv_indev_create();
    lv_indev_set_type(mouse, LV_INDEV_TYPE_POINTER);
    lv_indev_set_read_cb(mouse, mouse_read);
    lv_indev_set_gesture_min_distance(mouse, 30);
    lv_indev_set_gesture_min_velocity(mouse, 1);

    ui_init();
    return 0;
}

__attribute__((export_name("sim_step")))
int sim_step(int ms)
{
    lv_tick_inc(ms);
    dirty = 0;
    lv_timer_handler();
    return dirty;
}

__attribute__((export_name("sim_mouse")))
void sim_mouse(int x, int y, int down)
{
    mouse_pt.x = x;
    mouse_pt.y = y;
    mouse_down = down;
}

__attribute__((export_name("sim_fb")))
uint8_t *sim_fb(void)
{
    return fb;
}

__attribute__((export_name("sim_show_page")))
void sim_show_page(int idx)
{
    ui_show_page(idx);
}
