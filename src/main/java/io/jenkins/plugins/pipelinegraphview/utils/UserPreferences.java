package io.jenkins.plugins.pipelinegraphview.utils;

import hudson.Extension;
import hudson.model.User;
import hudson.model.UserProperty;
import hudson.model.UserPropertyDescriptor;
import net.sf.json.JSONObject;
import org.kohsuke.stapler.DataBoundConstructor;

public class UserPreferences extends UserProperty {
    private String timezone;

    @DataBoundConstructor
    public UserPreferences(String timezone) {
        this.timezone = timezone;
    }

    public String getTimezone() {
        return timezone;
    }

    @Extension
    public static final class DescriptorImpl extends UserPropertyDescriptor {
        @Override
        public UserProperty newInstance(User user) {
            return new UserPreferences("UTC");
        }

        @Override
        public String getDisplayName() {
            return "User Preferences";
        }

        public UserProperty newInstance(User user, JSONObject json) throws FormException {
            return new UserPreferences(json.getString("timezone"));
        }
    }
}
