package com.syllune.study;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

/** Feeds the widget list with the tasks of the currently selected day. */
public class PlannerWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        return new PlannerFactory(getApplicationContext(), widgetId);
    }

    static class PlannerFactory implements RemoteViewsService.RemoteViewsFactory {
        private final Context context;
        private final int widgetId;
        private JSONArray tasks = new JSONArray();
        private String dayKey = "";
        private boolean dark;

        PlannerFactory(Context context, int widgetId) {
            this.context = context;
            this.widgetId = widgetId;
        }

        private void load() {
            JSONObject day = WidgetStore.dayAt(context, WidgetStore.offset(context, widgetId));
            tasks = day != null && day.optJSONArray("tasks") != null ? day.optJSONArray("tasks") : new JSONArray();
            dayKey = day != null ? day.optString("key", "") : "";
            dark = (context.getResources().getConfiguration().uiMode
                & android.content.res.Configuration.UI_MODE_NIGHT_MASK)
                == android.content.res.Configuration.UI_MODE_NIGHT_YES;
        }

        @Override public void onCreate() { load(); }
        @Override public void onDataSetChanged() { load(); }
        @Override public void onDestroy() {}
        @Override public int getCount() { return tasks.length(); }
        @Override public RemoteViews getLoadingView() { return null; }
        @Override public int getViewTypeCount() { return 1; }
        @Override public long getItemId(int position) { return position; }
        @Override public boolean hasStableIds() { return true; }

        @Override
        public RemoteViews getViewAt(int position) {
            JSONObject task = tasks.optJSONObject(position);
            RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_planner_item);
            if (task == null) return row;

            boolean done = task.optBoolean("done", false);
            int textColor = dark ? 0xFFF3F4FB : 0xFF141826;
            int mutedColor = dark ? 0xFFA9B0C6 : 0xFF6B7280;

            row.setTextViewText(R.id.item_title, task.optString("title", "Study block"));
            row.setTextColor(R.id.item_title, done ? mutedColor : textColor);
            String time = task.optString("time", "");
            row.setTextViewText(R.id.item_time, time);
            row.setViewVisibility(R.id.item_time, time.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
            row.setTextColor(R.id.item_time, mutedColor);

            String emoji = task.optString("emoji", "");
            row.setTextViewText(R.id.item_emoji, emoji);
            row.setViewVisibility(R.id.item_emoji, emoji.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);

            int color = 0xFF7C6CF6;
            try {
                color = Color.parseColor(task.optString("color", "#7C6CF6"));
            } catch (IllegalArgumentException ignored) {
            }
            row.setInt(R.id.item_bar, "setColorFilter", color);
            row.setInt(R.id.item_root, "setBackgroundResource", R.drawable.widget_row_bg);
            row.setImageViewResource(R.id.item_check, done ? R.drawable.widget_check_on : R.drawable.widget_check_off);

            Intent open = new Intent(PlannerWidgetProvider.ACTION_OPEN);
            open.putExtra(PlannerWidgetProvider.EXTRA_ENTRY_ID, task.optString("id"));
            row.setOnClickFillInIntent(R.id.item_root, open);

            Intent toggle = new Intent(PlannerWidgetProvider.ACTION_TOGGLE);
            toggle.putExtra(PlannerWidgetProvider.EXTRA_ENTRY_ID, task.optString("id"));
            toggle.putExtra(PlannerWidgetProvider.EXTRA_DAY, dayKey);
            toggle.putExtra(PlannerWidgetProvider.EXTRA_DONE, done);
            row.setOnClickFillInIntent(R.id.item_check, toggle);

            return row;
        }
    }
}
