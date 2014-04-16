((templates, _undefined) -> 
  templates["test/fixtures/one.tpl.html"] = "1 2 3";
  templates["test/fixtures/two.tpl.html"] = "Testing";
  return;
)(this.templates = this.templates || {});