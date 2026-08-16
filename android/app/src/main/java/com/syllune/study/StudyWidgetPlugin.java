package com.syllune.study;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;

/** Bridge that keeps the home-screen planner widget in sync with the app. */
@CapacitorPlugin(name = "StudyWidget")
public class StudyWidgetPlugin extends Plugin {

    @PluginMethod
    public void setData(PluginCall call) {
        String payload = call.getString("payload", "{}");
        WidgetStore.prefs(getContext()).edit().putString(WidgetStore.KEY_PAYLOAD, payload).apply();
        WidgetStore.refresh(getContext());
        call.resolve();
    }

    @PluginMethod
    public void setOpacity(PluginCall call) {
        Double opacity = call.getDouble("opacity", 0.75d);
        WidgetStore.prefs(getContext()).edit()
            .putFloat(WidgetStore.KEY_OPACITY, opacity == null ? 0.75f : opacity.floatValue()).apply();
        WidgetStore.refresh(getContext());
        call.resolve();
    }

    /** Returns (and clears) the completion toggles made from the widget. */
    @PluginMethod
    public void consumeToggles(PluginCall call) {
        JSObject result = new JSObject();
        try {
            result.put("toggles", new JSONArray(WidgetStore.takePending(getContext())));
        } catch (JSONException error) {
            result.put("toggles", new JSONArray());
        }
        call.resolve(result);
    }
}
