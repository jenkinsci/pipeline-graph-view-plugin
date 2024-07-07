package io.jenkins.plugins.pipelinegraphview;

import hudson.Extension;
import hudson.model.RootAction;
import hudson.model.TimeZoneProperty;
import hudson.model.User;
import hudson.util.HttpResponses;
import java.util.TimeZone;
import net.sf.json.JSONObject;
import org.jenkinsci.Symbol;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.verb.GET;

@Extension
@Symbol("pipelineGraphViewUser")
public class PipelineGraphViewUserConfigurationAction implements RootAction {
    @WebMethod(name = "getUserPreferences")
    @GET
    public HttpResponse getUserPreferences() {
        User user = User.current();
        JSONObject preferencesJson = new JSONObject();
        if (user != null) {
            String timezone = getUserTimezone(user);

            // If a user didnt specify a timezone getUserTimezone comes back empty,
            // set it to server time and allow the frontend to attempt to detect a users tz
            if (timezone == null || timezone.isEmpty()) {
                timezone = getServerTimezone();
            }
            preferencesJson.put("timezone", timezone);
        } else {
            preferencesJson.put("timezone", getServerTimezone());
        }
        return HttpResponses.okJSON(preferencesJson);
    }

    private String getUserTimezone(User user) {
        TimeZoneProperty timezoneProperty = user.getProperty(TimeZoneProperty.class);
        if (timezoneProperty != null) {
            return timezoneProperty.getTimeZoneName();
        }
        return TimeZone.getDefault().getID(); // Default timezone if none found
    }

    private String getServerTimezone() {
        TimeZone serverTimezone = TimeZone.getDefault();
        return serverTimezone.getID();
    }

    @Override
    public String getDisplayName() {
        return "Pipeline Graph View User Configuration";
    }

    @Override
    public String getUrlName() {
        return "multi-pipeline-graph";
    }

    @Override
    public String getIconFileName() {
        return null;
    }
}
