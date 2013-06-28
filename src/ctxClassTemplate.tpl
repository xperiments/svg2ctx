var {{{package.[0]}}};
(function ({{{package.[0]}}}) {
	(function ({{{package.[1]}}}) {
		var {{{className}}} = (function () {
			function {{{className}}}(ctx, ready) {
			    this.ready = ready;
				this.ctx = ctx;
				this.gradients = [];
				this.images = [];
				this.totalImages = {{{totalImages}}};
				this.totalToLoadImages = {{{totalImages}}};
				this.initializeGradients();
				if( this.totalImages !=0 )
				{
				    this.loadImages();
				}
				else
				{
				    this.ready && this.ready();
				}

				this.width ={{width}};
				this.height ={{height}};
			};
			{{{className}}}.prototype.setter = function (ctx, key, value) {
				ctx[key] = value;

			};
			{{{className}}}.prototype.render = function (ctx)
			{
				if (typeof ctx === "undefined") { ctx = this.ctx; };
{{{render}}};
			};
			{{{className}}}.prototype.loadImages = function ()
			{
{{{images}}};
			};
			{{{className}}}.prototype.onImageLoaded = function ()
			{
                if( --this.totalToLoadImages == 0 )
                {
                    this.ready && this.ready();
                }
			};
			{{{className}}}.prototype.initializeGradients = function ()
			{
{{{gradients}}};
			};

			return {{{className}}};
		})();
		{{{package.[1]}}}.{{{className}}} = {{{className}}};
	})({{{package.[0]}}}.{{{package.[1]}}} || ({{{package.[0]}}}.{{{package.[1]}}} = {}));
	var {{{package.[1]}}} = {{{package.[0]}}}.{{{package.[1]}}};
})({{{package.[0]}}} || ({{{package.[0]}}} = {}));
