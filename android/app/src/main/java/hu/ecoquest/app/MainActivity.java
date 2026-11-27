package hu.ecoquest.app;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    if (this.bridge != null && this.bridge.getWebView() != null) {
      this.bridge.getWebView().setHorizontalScrollBarEnabled(false);
      this.bridge.getWebView().setVerticalScrollBarEnabled(false);
      this.bridge.getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
  }
}
