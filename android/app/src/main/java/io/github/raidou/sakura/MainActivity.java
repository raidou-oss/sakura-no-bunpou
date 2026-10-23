package io.github.raidou.sakura;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Le site dans une WebView Chromium plein écran, réglée pour la fluidité. */
public class MainActivity extends Activity {
    private static final String HOST = "raidou-oss.github.io";
    private static final String HOME = "https://" + HOST + "/sakura-no-bunpou/";
    private static final int FILE_REQ = 7;

    private WebView web;
    private ValueCallback<Uri[]> fileCb;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#040A22"));
        w.setNavigationBarColor(Color.parseColor("#040A22"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#040A22"));
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // progression, réglages (localStorage)
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(false);   // SFX et voix japonaise
        s.setTextZoom(100);                    // la mise en page ne dépend pas de la taille de police système
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setAllowFileAccess(false);
        s.setOffscreenPreRaster(true);         // pré-rendu : défilement plus fluide
        s.setUserAgentString(s.getUserAgentString() + " SakuraApp/1.0");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost()) && u.getPath() != null && u.getPath().startsWith("/sakura-no-bunpou")) return false;
                if ("https".equals(u.getScheme()) && u.getHost() != null && u.getHost().endsWith("supabase.co")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException ignored) { }
                return true;   // liens externes : navigateur
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) v.loadDataWithBaseURL(HOME, OFFLINE, "text/html", "utf-8", null);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            // Choix d'une image (photo de profil)
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                try { startActivityForResult(p.createIntent(), FILE_REQ); }
                catch (ActivityNotFoundException e) { fileCb = null; return false; }
                return true;
            }
        });

        if (saved != null) web.restoreState(saved);
        else web.loadUrl(startUrl(getIntent()));
    }

    private static String startUrl(Intent i) {
        Uri d = i != null ? i.getData() : null;
        return d != null && HOST.equals(d.getHost()) ? d.toString() : HOME;
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        if (i.getData() != null) web.loadUrl(startUrl(i));
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == FILE_REQ && fileCb != null) {
            fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            fileCb = null;
        } else super.onActivityResult(req, res, data);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();   // le routage du site passe par l'historique (#/…)
        else super.onBackPressed();
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onResume() { super.onResume(); web.onResume(); web.resumeTimers(); }
    @Override protected void onPause() { web.onPause(); web.pauseTimers(); CookieManager.getInstance().flush(); super.onPause(); }   // batterie
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }

    private static final String OFFLINE = "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>"
        + "<body style='margin:0;height:100vh;display:grid;place-items:center;background:#040A22;color:#e8ecff;font-family:sans-serif;text-align:center'>"
        + "<div><div style='font-size:64px'>🌸</div><h2 style='color:#FF8CC6'>Hors ligne</h2><p>Pas de connexion pour charger 桜の文法.</p>"
        + "<button onclick=\"location.href='" + HOME + "'\" style='margin-top:12px;padding:12px 26px;border:0;border-radius:10px;background:#FF8CC6;color:#040A22;font-weight:700;font-size:16px'>Réessayer</button></div>";
}
