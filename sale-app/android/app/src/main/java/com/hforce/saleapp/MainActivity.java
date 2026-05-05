package com.hforce.saleapp;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable printing support for WebView
        android.webkit.WebView webView = bridge.getWebView();
        webView.setWebChromeClient(new android.webkit.WebChromeClient() {
            @Override
            public boolean onJsAlert(android.webkit.WebView view, String url, String message, android.webkit.JsResult result) {
                // Handle standard alerts if needed
                return super.onJsAlert(view, url, message, result);
            }
        });

        // Add a Javascript Interface for direct printing if window.print() fails
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void print() {
                runOnUiThread(() -> {
                    android.print.PrintManager printManager = (android.print.PrintManager) getSystemService(android.content.Context.PRINT_SERVICE);
                    android.print.PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter("H-Force Document");
                    String jobName = getString(R.string.app_name) + " Document";
                    printManager.print(jobName, printAdapter, new android.print.PrintAttributes.Builder().build());
                });
            }
        }, "AndroidPrint");
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN);
    }
}
