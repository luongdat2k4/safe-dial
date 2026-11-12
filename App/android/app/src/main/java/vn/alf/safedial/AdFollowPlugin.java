package vn.alf.safedial;

import android.graphics.Rect;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.widget.FrameLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;
import java.util.Map;

/**
 * Keeps a native ad (an AppLovin MAX MREC drawn above the WebView) glued to its placeholder while the page scrolls.
 *
 * An ad is a native view, so it does not scroll with the page. Sending its position over the bridge every frame
 * makes it arrive 50-65 ms after the page. Here JS sends the ad's position in the page once (the rect plus the
 * page's scrollY), and the ad is moved inside the frame that is about to be drawn, from the WebView's own scroll
 * offset, so the ad and the page always use the same value. This only works for a page that scrolls on the
 * document, because WebView.getScrollY() does not see the scroll of an inner overflow element.
 *
 * The ad is also clipped to the band the page lets it draw in (between the sticky header and the bottom
 * navigation / banner), so it can slide under them like any row instead of vanishing. setClipBounds does not stop
 * touches, so empty views over the clipped parts forward them to the WebView and a tap on a bar never hits the ad.
 */
@CapacitorPlugin(name = "SafeDialAdFollow")
public class AdFollowPlugin extends Plugin {
    // An MREC is always 300x250dp; the rect only says where to centre it (same as the MAX plugin).
    private static final float MREC_WIDTH_DP = 300f;
    private static final float MREC_HEIGHT_DP = 250f;

    private static final class Follow {
        View ad;
        boolean follows;
        float pageTop;              // px, from the top of the page, where the ad's layout top sits
        float clipTop = -1;         // px from the top of the screen; -1 = no clip on that side
        float clipBottom = -1;
        View above, below;          // touch covers over the clipped parts
        final Rect clip = new Rect();
        int appliedTop = Integer.MIN_VALUE, appliedBottom = Integer.MIN_VALUE;
    }

    private final Map<String, Follow> follows = new HashMap<>();
    private ViewTreeObserver.OnPreDrawListener preDraw;

    @PluginMethod
    public void place(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String adUnitId = call.getString("adUnitId");
            View ad = findAd(adUnitId);
            if (ad == null) { call.reject("ad view not found"); return; }
            float d = density();
            float x = (float) call.getData().optDouble("x", 0d);
            float y = (float) call.getData().optDouble("y", 0d);
            float w = (float) call.getData().optDouble("width", MREC_WIDTH_DP);
            float h = (float) call.getData().optDouble("height", MREC_HEIGHT_DP);
            double scrollY = call.getData().optDouble("scrollY", -1d);
            double clipTop = call.getData().optDouble("clipTop", -1d);
            double clipBottom = call.getData().optDouble("clipBottom", -1d);

            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(MREC_WIDTH_DP * d), Math.round(MREC_HEIGHT_DP * d));
            lp.gravity = Gravity.TOP | Gravity.START;
            lp.leftMargin = Math.round((x + (w - MREC_WIDTH_DP) / 2f) * d);
            lp.topMargin = Math.round((y + (h - MREC_HEIGHT_DP) / 2f) * d);
            Follow f = follows.get(adUnitId);
            if (f == null) { f = new Follow(); follows.put(adUnitId, f); }
            f.ad = ad;
            f.follows = scrollY >= 0;
            f.pageTop = lp.topMargin + (float) (Math.max(scrollY, 0d) * d);
            f.clipTop = clipTop < 0 ? -1 : (float) (clipTop * d);
            f.clipBottom = clipBottom < 0 ? -1 : (float) (clipBottom * d);
            ad.setLayoutParams(lp);
            apply(f, getBridge().getWebView().getScrollY());
            ensureListener();
            call.resolve();
        });
    }

    @PluginMethod
    public void release(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Follow f = follows.remove(call.getString("adUnitId"));
            if (f != null) clear(f);
            removeListenerIfIdle();
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        for (Follow f : follows.values()) clear(f);
        follows.clear();
        removeListenerIfIdle();
        super.handleOnDestroy();
    }

    private void ensureListener() {
        if (preDraw != null) return;
        preDraw = () -> {
            int scroll = getBridge().getWebView().getScrollY();
            for (Follow f : follows.values()) apply(f, scroll);
            return true;
        };
        getBridge().getWebView().getViewTreeObserver().addOnPreDrawListener(preDraw);
    }

    private void removeListenerIfIdle() {
        if (preDraw == null || !follows.isEmpty()) return;
        ViewTreeObserver observer = getBridge().getWebView().getViewTreeObserver();
        if (observer.isAlive()) observer.removeOnPreDrawListener(preDraw);
        preDraw = null;
    }

    // Runs just before a frame is drawn: moves and clips the ad using the scroll offset this frame will use.
    private void apply(Follow f, int scroll) {
        View ad = f.ad;
        if (ad == null || !(ad.getLayoutParams() instanceof FrameLayout.LayoutParams)) return;
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) ad.getLayoutParams();
        float ty = f.follows ? Math.round(f.pageTop - scroll) - lp.topMargin : 0;
        if (ad.getTranslationY() != ty) ad.setTranslationY(ty);

        int h = ad.getHeight(), w = ad.getWidth();
        if (ad.getVisibility() != View.VISIBLE || h <= 0 || (f.clipTop < 0 && f.clipBottom < 0)) {
            if (f.appliedTop != -1 || f.appliedBottom != -1) { ad.setClipBounds(null); f.appliedTop = -1; f.appliedBottom = -1; }
            placeCover(f.above, lp, ty, 0, 0, w);
            placeCover(f.below, lp, ty, 0, 0, w);
            return;
        }
        float at = lp.topMargin + ad.getTranslationY();
        int from = f.clipTop < 0 ? 0 : Math.max(0, Math.min(h, Math.round(f.clipTop - at)));
        int to = f.clipBottom < 0 ? h : Math.max(from, Math.min(h, Math.round(f.clipBottom - at)));
        if (from != f.appliedTop || to != f.appliedBottom) {
            f.appliedTop = from;
            f.appliedBottom = to;
            if (from == 0 && to == h) ad.setClipBounds(null);
            else { f.clip.set(0, from, w, to); ad.setClipBounds(f.clip); }
        }
        if (f.above == null) { f.above = cover(); f.below = cover(); }
        placeCover(f.above, lp, ty, 0, from, w);
        placeCover(f.below, lp, ty, to, h, w);
    }

    // Puts a cover over rows y0..y1 of the ad (px inside the ad). It follows the ad's translation without a layout
    // pass; its size and margin only change when the clip itself changes.
    private void placeCover(View cover, FrameLayout.LayoutParams ad, float translation, int y0, int y1, int w) {
        if (cover == null) return;
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) cover.getLayoutParams();
        int height = Math.max(0, y1 - y0);
        int width = height > 0 ? w : 0;
        int top = ad.topMargin + (height > 0 ? y0 : 0);
        if (lp.width != width || lp.height != height || lp.topMargin != top || lp.leftMargin != ad.leftMargin) {
            lp.width = width;
            lp.height = height;
            lp.topMargin = top;
            lp.leftMargin = ad.leftMargin;
            cover.setLayoutParams(lp);
        }
        if (cover.getTranslationY() != translation) cover.setTranslationY(translation);
    }

    private View cover() {
        View v = new View(getContext());
        v.setOnTouchListener((view, e) -> {
            View page = getBridge().getWebView();
            int[] at = new int[2];
            page.getLocationOnScreen(at);
            MotionEvent on = MotionEvent.obtain(e);
            on.setLocation(e.getRawX() - at[0], e.getRawY() - at[1]);
            page.dispatchTouchEvent(on);
            on.recycle();
            return true;
        });
        v.setElevation(1000f);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(0, 0);
        lp.gravity = Gravity.TOP | Gravity.START;
        container().addView(v, lp);
        return v;
    }

    private void clear(Follow f) {
        if (f.ad != null) {
            f.ad.setTranslationY(0);
            f.ad.setClipBounds(null);
        }
        if (f.above != null) container().removeView(f.above);
        if (f.below != null) container().removeView(f.below);
        f.above = null;
        f.below = null;
    }

    // The MAX plugin adds its views to the window content container, so the ad is found there by its unit id.
    private View findAd(String adUnitId) {
        FrameLayout container = container();
        for (int i = 0; i < container.getChildCount(); i++) {
            View child = container.getChildAt(i);
            if (!child.getClass().getName().endsWith("MaxAdView")) continue;
            try {
                Object id = child.getClass().getMethod("getAdUnitId").invoke(child);
                if (adUnitId != null && adUnitId.equals(id)) return child;
            } catch (ReflectiveOperationException ignored) { }
        }
        return null;
    }

    private FrameLayout container() {
        return (FrameLayout) getActivity().findViewById(android.R.id.content);
    }

    private float density() {
        return getContext().getResources().getDisplayMetrics().density;
    }
}
