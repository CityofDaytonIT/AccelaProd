/*------------------------------------------------------------------------------------------------------/
| Accela Automation
| Accela, Inc.
| Copyright (C): 2012
|
| Program : INCLUDES_CUSTOM.js
| Event   : N/A
|
| Usage   : Custom Script Include.  Insert custom EMSE Function below and they will be 
|	    available to all master scripts
|
| Notes   :
|
/------------------------------------------------------------------------------------------------------*/
logDebug("Accessing INCLUDES_CUSTOM");
eval( aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput().getMasterScript(aa.getServiceProviderCode(),"INCLUDES_CUSTOM","ADMIN").getScriptText() + "");
eval( aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput().getMasterScript(aa.getServiceProviderCode(),"INCLUDES_LICENSES","ADMIN").getScriptText() + "");