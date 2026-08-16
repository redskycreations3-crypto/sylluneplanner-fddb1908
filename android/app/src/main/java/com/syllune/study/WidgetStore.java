package com.syllune.study;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Shared storage between the web app and the home-screen planner widget. */
public final class WidgetStore {
    public static final String PREFS = "syllune_widget";
    public static final String KEY_PAYLOAD = "payload";
    public static final String KEY_OPACITY = "opacity";
    public static final String KEY_PENDING = "pending";
    public static final String KEY_OFFSET = "offset_";

    private WidgetStore() {}

    public static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static JSONObject payload(Context context) {
        try {
            return new JSONObject(prefs(context).getString(KEY_PAYLOAD, "{}"));
        } catch (JSONException error) {
            return new JSONObject();
        }
    }

    /** Days are sent by the app as a list of { key, label, subtitle, tasks[] }. */
    public static JSONObject dayAt(Context context, int offset) {
        JSONObject payload = payload(context);
        JSONArray days = payload.optJSONArray("days");
        if (days == null || days.length() == 0) return null;
        int base = payload.optInt("todayIndex", 0);
        int index = base + offset;
        if (index < 0 || index >= days.length()) return null;
        return days.optJSONObject(index);
    }

    public static int offset(Context context, int widgetId) {
        return prefs(context).getInt(KEY_OFFSET + widgetId, 0);
    }

    public static void setOffset(Context context, int widgetId, int offset) {
        prefs(context).edit().putInt(KEY_OFFSET + widgetId, offset).apply();
    }

    public static float opacity(Context context) {
        return prefs(context).getFloat(KEY_OPACITY, 0.75f);
    }

    /** Records a completion toggle made from the widget so the app can sync it. */
    public static void queueToggle(Context context, String entryId, String day, boolean done) {
        SharedPreferences prefs = prefs(context);
        JSONArray pending;
        try {
            pending = new JSONArray(prefs.getString(KEY_PENDING, "[]"));
        } catch (JSONException error) {
            pending = new JSONArray();
        }
        try {
            JSONObject item = new JSONObject();
            item.put("entryId", entryId);
            item.put("day", day);
            item.put("done", done);
            item.put("at", System.currentTimeMillis());
            pending.put(item);
        } catch (JSONException ignored) {
        }
        // Optimistically flip the cached payload so the widget updates instantly.
        try {
            JSONObject payload = payload(context);
            JSONArray days = payload.optJSONArray("days");
            if (days != null) {
                for (int i = 0; i < days.length(); i++) {
                    JSONObject dayObject = days.optJSONObject(i);
                    if (dayObject == null || !day.equals(dayObject.optString("key"))) continue;
                    JSONArray tasks = dayObject.optJSONArray("tasks");
                    if (tasks == null) continue;
                    for (int t = 0; t < tasks.length(); t++) {
                        JSONObject task = tasks.optJSONObject(t);
                        if (task != null && entryId.equals(task.optString("id"))) task.put("done", done);
                    }
                }
            }
            prefs.edit()
                .putString(KEY_PENDING, pending.toString())
                .putString(KEY_PAYLOAD, payload.toString())
                .apply();
        } catch (JSONException ignored) {
            prefs.edit().putString(KEY_PENDING, pending.toString()).apply();
        }
    }

    public static String takePending(Context context) {
        SharedPreferences prefs = prefs(context);
        String pending = prefs.getString(KEY_PENDING, "[]");
        prefs.edit().putString(KEY_PENDING, "[]").apply();
        return pending;
    }

    /** Redraws every placed planner widget. */
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, PlannerWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids == null || ids.length == 0) return;
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list);
        Intent intent = new Intent(context, PlannerWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }
}
