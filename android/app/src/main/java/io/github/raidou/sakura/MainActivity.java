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

    private static final String LOGO = "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";
    private static final String OFFLINE = "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>"
        + "<body style='margin:0;height:100vh;display:grid;place-items:center;background:#040A22;color:#e8ecff;font-family:sans-serif;text-align:center'>"
        + "<div><img src='data:image/png;base64," + LOGO + "' width='96' height='96' style='border-radius:22px'><h2 style='color:#FF8CC6'>Hors ligne</h2><p>Pas de connexion pour charger 桜の文法.</p>"
        + "<button onclick=\"location.href='" + HOME + "'\" style='margin-top:12px;padding:12px 26px;border:0;border-radius:10px;background:#FF8CC6;color:#040A22;font-weight:700;font-size:16px'>Réessayer</button></div>";
}
