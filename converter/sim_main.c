/* SPJ 导入工程的模拟器入口（窗口尺寸取自生成的 ui.h） */
#define SDL_MAIN_HANDLED
#include <SDL2/SDL.h>
#include <lvgl/lvgl.h>
#include "ui.h"

int main(int argc, char *argv[])
{
    (void)argc; (void)argv;

    lv_init();

    lv_display_t *disp = lv_sdl_window_create(UI_SCREEN_WIDTH, UI_SCREEN_HEIGHT);
    if (!disp) return 1;

    lv_indev_t *mouse = lv_sdl_mouse_create();
    lv_indev_set_gesture_min_distance(mouse, 30);
    lv_indev_set_gesture_min_velocity(mouse, 1);

    ui_init();

    for (;;) {
        uint32_t wait = lv_timer_handler();
        if (wait == LV_NO_TIMER_READY) wait = 5;
        SDL_Delay(wait > 5 ? 5 : wait);
    }
    return 0;
}
