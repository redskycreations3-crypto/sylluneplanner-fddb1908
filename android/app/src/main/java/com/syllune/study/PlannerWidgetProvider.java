package com.syllune.study;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Home-screen widget listing the planner tasks of a selected day. */
public class PlannerWidgetProvider extends AppWidgetProvider {

    static final String ACTION_PREV = "com.syllune.study.WIDGET_PREV";
    static final String ACTION_NEXT = "com.syllune.study.WIDGET_NEXT";
    static final String ACTION_TOGGLE = "com.syllune.study.WIDGET_TOGGLE";
    static final String ACTION_OPEN = "com.syllune.study.WIDGET_OPEN";
    static final String EXTRA_ENTRY_ID = "entryId";
    static final String EXTRA_DAY = "day";
    static final String EXTRA_DONE = "done";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int widgetId : widgetIds) render(context, manager, widgetId);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int widgetId, android.os.Bundle newOptions) {
        render(context, manager, widgetId);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);

        if (ACTION_PREV.equals(action) || ACTION_NEXT.equals(action)) {
            int step = ACTION_NEXT.equals(action) ? 1 : -1;
            WidgetStore.setOffset(context, widgetId, WidgetStore.offset(context, widgetId) + step);
            manager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_list);
            render(context, manager, widgetId);
            return;
        }

        if (ACTION_TOGGLE.equals(action)) {
            String entryId = intent.getStringExtra(EXTRA_ENTRY_ID);
            String day = intent.getStringExtra(EXTRA_DAY);
            if (entryId != null && day != null) {
                WidgetStore.queueToggle(context, entryId, day, !intent.getBooleanExtra(EXTRA_DONE, false));
                WidgetStore.refresh(context);
            }
            return;
        }

        if (ACTION_OPEN.equals(action)) {
            Intent open = new Intent(context, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            open.setData(Uri.parse("syllune://planner?entry=" + intent.getStringExtra(EXTRA_ENTRY_ID)));
            context.startActivity(open);
            return;
        }

        super.onReceive(context, intent);
    }

    private static PendingIntent broadcast(Context context, String action, int widgetId) {
        Intent intent = new Intent(context, PlannerWidgetProvider.class);
        intent.setAction(action);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        intent.setData(Uri.parse("syllune://widget/" + widgetId + "/" + action));
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
    }

    static void render(Context context, AppWidgetManager manager, int widgetId) {
        boolean dark = (context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
            == Configuration.UI_MODE_NIGHT_YES;
        int background = dark ? 0x141826 : 0xFFFFFF;
        int textColor = dark ? 0xFFF3F4FB : 0xFF141826;
        int mutedColor = dark ? 0xFFA9B0C6 : 0xFF6B7280;
        int alpha = Math.round(Math.max(0.05f, Math.min(1f, WidgetStore.opacity(context))) * 255f);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_planner);
        views.setInt(R.id.widget_bg, "setColorFilter", background);
        views.setInt(R.id.widget_bg, "setImageAlpha", alpha);
        views.setTextColor(R.id.widget_title, textColor);
        views.setTextColor(R.id.widget_subtitle, mutedColor);
        views.setTextColor(R.id.widget_empty, mutedColor);
        views.setInt(R.id.widget_prev, "setColorFilter", textColor);
        views.setInt(R.id.widget_next, "setColorFilter", textColor);

        int offset = WidgetStore.offset(context, widgetId);
        JSONObject day = WidgetStore.dayAt(context, offset);
        String label = day != null ? day.optString("label", "Today") : "Today";
        int count = day != null && day.optJSONArray("tasks") != null ? day.optJSONArray("tasks").length() : 0;
        views.setTextViewText(R.id.widget_title, label);
        views.setTextViewText(R.id.widget_subtitle,
            day == null ? "Open Syllune to sync" : count + (count == 1 ? " task" : " tasks"));

        views.setOnClickPendingIntent(R.id.widget_prev, broadcast(context, ACTION_PREV, widgetId));
        views.setOnClickPendingIntent(R.id.widget_next, broadcast(context, ACTION_NEXT, widgetId));

        Intent service = new Intent(context, PlannerWidgetService.class);
        service.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        service.setData(Uri.parse(service.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_list, service);
        views.setEmptyView(R.id.widget_list, R.id.widget_empty);
        views.setViewVisibility(R.id.widget_empty, count == 0 ? android.view.View.VISIBLE : android.view.View.GONE);
        views.setViewVisibility(R.id.widget_list, count == 0 ? android.view.View.GONE : android.view.View.VISIBLE);

        Intent template = new Intent(context, PlannerWidgetProvider.class);
        template.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        PendingIntent templateIntent = PendingIntent.getBroadcast(context, 1, template,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        views.setPendingIntentTemplate(R.id.widget_list, templateIntent);

        manager.updateAppWidget(widgetId, views);
        manager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_list);
    }
}
